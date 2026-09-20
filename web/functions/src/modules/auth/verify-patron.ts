import * as admin from "firebase-admin";
import { notifyPatron } from "../circulation/circulation-policy";
import * as functions from "firebase-functions";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { FUNCTIONS_BASE_URL } from "../../config/runtime";
import { v4 as uuidv4 } from "uuid";
import { defineJsonSecret, defineSecret } from "firebase-functions/params";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import { DEFAULT_AVATAR } from "../../config/constants";
import { verifyCaptchaToken } from "../../core/captcha";
import { formatToE164 } from "../../core/coerce";
import { requireStaffActor } from "../../core/guards";
import { nameLower } from "../circulation/circulation-lookups";
import {
  createTransporter,
  renderActionEmail,
  renderResultPage,
  escapeHtml,
} from "./email-templates";
import {
  assertBirthDate,
  assertEmail,
  assertName,
  assertPasswordStrength,
  invalid,
  optionalString,
  requiredString,
} from "./auth-validation";
import {
  ActorIdentity,
  EditLogData,
  EmailUpdateToken,
  LogData,
  PatronRegistrationInput,
  PatronUserData,
  PendingRegistration,
  RegistrationFlow,
  UpdatedEmailData,
} from "./auth-types";
import { Timestamp, auth, db, storage } from "../../core/firebase";

const smtpConfig = defineJsonSecret("SMTP_CONFIG");
const recaptchaSecretKey = defineSecret("RECAPTCHA_SECRET_KEY");

const TOKEN_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const FUNCTIONS_BASE = FUNCTIONS_BASE_URL;
const VERIFICATIONS = "email_verifications";

class TokenError extends Error {
  constructor(
    readonly heading: string,
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

interface NormalizedPatron {
  email: string;
  password: string;
  displayName: string;
  profile: Record<string, unknown>;
}

function normalizePatronInput(
  raw: unknown,
  flow: RegistrationFlow,
): NormalizedPatron {
  if (!raw || typeof raw !== "object") invalid("Missing registration details");
  const input = raw as PatronRegistrationInput;

  const FirstName = assertName(input.FirstName, "First name");
  const LastName = assertName(input.LastName, "Last name");
  const email = assertEmail(input.Email);
  const password = assertPasswordStrength(input.Password);

  const profile: Record<string, unknown> = {
    FirstName,
    LastName,
    MiddleName: optionalString(input.MiddleName),
    Suffix: optionalString(input.Suffix).toUpperCase(),
    Email: email,
    PhoneNumber: formatToE164(requiredString(input.PhoneNumber, "Phone number")),
    BirthDate: assertBirthDate(input.BirthDate),
    Sex: requiredString(input.Sex, "Sex"),
    City: requiredString(input.City, "City"),
    Barangay: requiredString(input.Barangay, "Barangay"),
    SchoolWork: requiredString(input.SchoolWork, "Education/Work status"),
    Avatar: optionalString(input.Avatar) || DEFAULT_AVATAR,
    ID: "",
    Role: "Patron",
    Status: "Active",
    State: flow === "patron-self" ? "Unverified" : "Verified",
  };

  return {
    email,
    password,
    displayName: `${FirstName} ${LastName}`,
    profile,
  };
}

// =====================================================================
// || Pending-registration plumbing                                   ||
// =====================================================================

async function findPendingByEmail(email: string) {
  const snapshot = await db
    .collection(VERIFICATIONS)
    .where("email", "==", email)
    .get();
  return (
    snapshot.docs.find((doc) => {
      const data = doc.data() as Partial<PendingRegistration>;
      return !!data.flow && !!data.authUid;
    }) || null
  );
}

async function moveTempId(fromToken: string, toToken: string) {
  try {
    const bucket = storage.bucket();
    const source = bucket.file(`ids_temp/${fromToken}.webp`);
    const [exists] = await source.exists();
    if (!exists) return;
    await source.copy(bucket.file(`ids_temp/${toToken}.webp`));
    await source.delete();
  } catch (err) {
    console.error("Failed to carry temp ID across token rotation:", err);
  }
}

async function deleteTempId(token: string) {
  try {
    const file = storage.bucket().file(`ids_temp/${token}.webp`);
    const [exists] = await file.exists();
    if (exists) await file.delete();
  } catch (err) {
    console.error("Failed to delete temp ID file:", err);
  }
}

async function provisionAuthUser(options: {
  email: string;
  password: string;
  displayName: string;
  existingAuthUid?: string;
}): Promise<string> {
  if (options.existingAuthUid) {
    await auth.updateUser(options.existingAuthUid, {
      password: options.password,
      displayName: options.displayName,
      emailVerified: false,
      disabled: true,
    });
    return options.existingAuthUid;
  }

  try {
    const existing = await auth.getUserByEmail(options.email);
    if (existing) {
      throw new functions.https.HttpsError(
        "already-exists",
        "Email already in use",
      );
    }
  } catch (lookupErr: unknown) {
    if (lookupErr instanceof functions.https.HttpsError) throw lookupErr;
    const error = lookupErr as { code?: string; message?: string };
    if (error?.code !== "auth/user-not-found") {
      console.error("Failed during email existence check:", lookupErr);
      throw new functions.https.HttpsError(
        "internal",
        error?.message || "Auth lookup failed",
      );
    }
  }

  const created = await auth.createUser({
    email: options.email,
    password: options.password,
    displayName: options.displayName,
    emailVerified: false,
    disabled: true,
  });
  return created.uid;
}

async function beginPatronRegistration(
  flow: RegistrationFlow,
  rawInput: unknown,
  actor: ActorIdentity | null,
): Promise<{ token: string }> {
  const normalized = normalizePatronInput(rawInput, flow);

  const pendingDoc = await findPendingByEmail(normalized.email);
  let existingAuthUid: string | undefined;

  if (pendingDoc) {
    const pending = pendingDoc.data() as PendingRegistration;
    const lastSent = Number(pending.createdOn) || 0;
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Please wait a moment before requesting another verification email.",
      );
    }
    existingAuthUid = pending.authUid;
  }

  const authUid = await provisionAuthUser({
    email: normalized.email,
    password: normalized.password,
    displayName: normalized.displayName,
    existingAuthUid,
  });

  const now = Date.now();
  const token = uuidv4();
  const patronName = normalized.displayName;

  const tokenDoc: PendingRegistration = {
    flow,
    email: normalized.email,
    authUid,
    profile: normalized.profile,
    createdByUID: actor?.publicUID || "",
    createdByName: actor?.fullName || patronName,
    expiresAt: now + TOKEN_TTL_MS,
    createdOn: now,
    token,
  };

  await db.collection(VERIFICATIONS).doc(token).set(tokenDoc);

  if (pendingDoc) {
    await moveTempId(pendingDoc.id, token);
    await pendingDoc.ref.delete().catch((err) => {
      console.error("Failed to delete superseded pending registration:", err);
    });
  }

  await sendPatronVerificationEmail(
    normalized.email,
    normalized.profile.FirstName as string,
    token,
  );

  return { token };
}

// =====================================================================
// || Callables                                                       ||
// =====================================================================

export const requestPatronSelfRegistration = onCall(
  { secrets: ["RECAPTCHA_SECRET_KEY", "SMTP_CONFIG"] },
  async (req) => {
    const { userData, captchaToken } = req.data || {};

    if (!captchaToken) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing captcha token",
      );
    }

    const captcha = await verifyCaptchaToken(
      captchaToken,
      recaptchaSecretKey.value(),
    );
    if (!captcha.success) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "reCAPTCHA verification failed",
      );
    }

    const { token } = await beginPatronRegistration(
      "patron-self",
      userData,
      null,
    );
    return { success: true, token };
  },
);

export const requestPatronLMSRegistration = onCall(
  { secrets: ["RECAPTCHA_SECRET_KEY", "SMTP_CONFIG"] },
  async (req) => {
    const actor = await requireStaffActor(req.auth?.uid, "PatronAdd");
    const { userData, captchaToken } = req.data || {};

    if (captchaToken) {
      const captcha = await verifyCaptchaToken(
        captchaToken,
        recaptchaSecretKey.value(),
      );
      if (!captcha.success) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "reCAPTCHA verification failed",
        );
      }
    }

    const { token } = await beginPatronRegistration(
      "patron-lms",
      userData,
      actor,
    );
    return { success: true, token };
  },
);

export const resendPatronVerificationEmail = onCall(
  { secrets: ["SMTP_CONFIG"] },
  async (req) => {
    const email = assertEmail(req.data?.email);

    const pendingDoc = await findPendingByEmail(email);
    if (!pendingDoc) {
      throw new functions.https.HttpsError(
        "not-found",
        "No pending verification found for this email. Please start registration again.",
      );
    }

    const pending = pendingDoc.data() as PendingRegistration;
    if (!pending.authUid || !pending.profile) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This verification request can no longer be resent. Please register again.",
      );
    }
    if (Date.now() - (Number(pending.createdOn) || 0) < RESEND_COOLDOWN_MS) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Please wait a moment before requesting another verification email.",
      );
    }

    const now = Date.now();
    const token = uuidv4();

    await db
      .collection(VERIFICATIONS)
      .doc(token)
      .set({
        ...pending,
        expiresAt: now + TOKEN_TTL_MS,
        createdOn: now,
        token,
      } satisfies PendingRegistration);

    await moveTempId(pendingDoc.id, token);
    await pendingDoc.ref.delete().catch((err) => {
      console.error("Failed to delete superseded pending registration:", err);
    });

    await sendPatronVerificationEmail(
      pending.email,
      String(pending.profile.FirstName || ""),
      token,
    );

    return { success: true, token };
  },
);

export const requestUpdatedEmailVerificationPatron = onCall(
  { secrets: ["SMTP_CONFIG"] },
  async (req) => {
    const actor = await requireStaffActor(req.auth?.uid, "PatronEdit");
    const { patronUID, uid, newEmail } = req.data || {};
    const targetUID = patronUID || uid;
    if (!targetUID || !newEmail) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "patronUID and newEmail are required",
      );
    }

    const email = assertEmail(newEmail);

    let patronRef = db.collection("patrons").doc(String(targetUID));
    let patronSnap = await patronRef.get();
    if (!patronSnap.exists) {
      const byField = await db
        .collection("patrons")
        .where("UID", "==", String(targetUID))
        .limit(1)
        .get();
      if (byField.empty) {
        throw new functions.https.HttpsError("not-found", "Patron not found");
      }
      patronRef = byField.docs[0].ref;
      patronSnap = byField.docs[0];
    }

    const patronData = (patronSnap.data() || {}) as PatronUserData;

    try {
      const existing = await auth.getUserByEmail(email);
      if (existing && existing.uid !== patronRef.id) {
        throw new functions.https.HttpsError(
          "already-exists",
          "Email already in use",
        );
      }
    } catch (lookupErr: unknown) {
      if (lookupErr instanceof functions.https.HttpsError) throw lookupErr;
      const error = lookupErr as { code?: string; message?: string };
      if (error?.code !== "auth/user-not-found") {
        console.error("Failed during newEmail existence check:", lookupErr);
        throw new functions.https.HttpsError(
          "internal",
          error?.message || "Auth lookup failed",
        );
      }
    }

    const updatedEmailData: UpdatedEmailData = {
      UID: patronRef.id,
      oldEmail: patronData.Email || null,
      patronPublicUID: patronData.UID || null,
      patronName:
        `${patronData.FirstName || ""} ${patronData.LastName || ""}`.trim(),
      staffPublicUID: actor.publicUID || null,
      staffFirstName: actor.firstName || null,
      staffLastName: actor.lastName || null,
    };

    const { token } = await sendUpdatedEmailVerificationPatron(
      email,
      updatedEmailData,
    );

    return { status: "sent", token };
  },
);

// =====================================================================
// || Verification endpoints                                          ||
// =====================================================================

function readCounter(snap: admin.firestore.DocumentSnapshot): number {
  const value = (snap.data() as { nextUID?: number } | undefined)?.nextUID;
  return typeof value === "number" && value > 0 ? value : 1;
}

export const verifyEmailTokenPatron = onRequest(async (req, res) => {
  const token = req.query.token as string;

  if (!token) {
    res.status(400).send(
      renderResultPage({
        title: "Invalid Link",
        heading: "Missing verification token",
        lines: ["This link is incomplete. Please use the button in your email."],
      }),
    );
    return;
  }

  const tokenRef = db.collection(VERIFICATIONS).doc(token);

  try {
    const outcome = await db.runTransaction(async (transaction) => {
      const tokenSnap = await transaction.get(tokenRef);
      if (!tokenSnap.exists) {
        throw new TokenError(
          "Link no longer valid",
          "This verification link has already been used or has expired.",
          410,
        );
      }

      const pending = tokenSnap.data() as PendingRegistration;
      if (!pending?.authUid || !pending?.profile) {
        throw new TokenError(
          "Link no longer valid",
          "This verification link is malformed. Please register again.",
          400,
        );
      }
      if (Date.now() > pending.expiresAt) {
        throw new TokenError(
          "Link expired",
          "This verification link has expired. Please request a new one.",
          410,
        );
      }

      const patronRef = db.collection("patrons").doc(pending.authUid);
      const patronSnap = await transaction.get(patronRef);

      if (patronSnap.exists) {
        transaction.delete(tokenRef);
        return {
          pending,
          assignedUID: (patronSnap.data() as PatronUserData)?.UID || "",
          alreadyExisted: true,
        };
      }

      const uidCounterRef = db.collection("metadata").doc("patron_uid_counter");
      const publicCounterRef = db.collection("metadata").doc("public_patron_UID");
      const [uidSnap, publicSnap] = await transaction.getAll(
        uidCounterRef,
        publicCounterRef,
      );

      const nextUID = readCounter(uidSnap);
      const nextPublic = readCounter(publicSnap);
      const assignedUID = `P${String(nextUID).padStart(7, "0")}`;
      const publicUID = `${new Date().getFullYear()}${String(nextPublic).padStart(5, "0")}`;

      transaction.set(patronRef, {
        ...pending.profile,
        UID: assignedUID,
        PublicUID: publicUID,
        NameLower: nameLower(pending.profile as Record<string, unknown>),
        CreatedOn: Timestamp.now(),
        CreatedBy: pending.createdByName,
      });
      transaction.set(uidCounterRef, { nextUID: nextUID + 1 }, { merge: true });
      transaction.set(
        publicCounterRef,
        { nextUID: nextPublic + 1 },
        { merge: true },
      );
      transaction.delete(tokenRef);

      return { pending, assignedUID, alreadyExisted: false };
    });

    const { pending, assignedUID, alreadyExisted } = outcome;

    if (alreadyExisted) {
      await deleteTempId(token);
      res.status(200).send(
        renderResultPage({
          title: "Already Verified",
          heading: "This account is already active",
          lines: [
            "Your email was verified previously. You may close this tab and log in to ePasig Library.",
          ],
        }),
      );
      return;
    }

    await admin
      .auth()
      .updateUser(pending.authUid, { emailVerified: true, disabled: false });

    await promoteTempIdToPermanent(token, assignedUID, pending.authUid);

    const patronName =
      `${pending.profile.FirstName || ""} ${pending.profile.LastName || ""}`.trim();

    const logData: LogData =
      pending.flow === "patron-self"
        ? {
            case: "patronRegistration",
            action: "PatronAdd",
            description: "Self-registered patron added",
            targetUID: assignedUID,
            targetName: patronName,
            createdOn: Timestamp.now(),
            createdBy: patronName,
            UID: assignedUID,
          }
        : {
            case: "patronLMSRegistration",
            action: "PatronAdd",
            description: `${assignedUID} added by ${pending.createdByUID}`,
            targetUID: assignedUID,
            targetName: patronName,
            createdOn: Timestamp.now(),
            createdBy: pending.createdByName,
            UID: pending.createdByUID,
          };

    try {
      await writingLogsAttemptInternal(logData);
    } catch (logErr) {
      console.error("Failed to write patron registration log:", logErr);
    }

    await notifyPatron(db, pending.authUid, {
      title: "Welcome to ePasig Library!",
      content:
        "Success! Your patron account is now active. Start exploring the library today.",
      type: "account",
    });

    res.status(200).send(
      renderResultPage({
        title: "Account Created",
        heading: "Patron Email Verified!",
        lines: [
          "Your patron account has been successfully created and your email is now verified.",
          "You may close this tab now and log in to ePasig Library.",
        ],
      }),
    );
  } catch (error: unknown) {
    if (error instanceof TokenError) {
      res.status(error.statusCode).send(
        renderResultPage({
          title: error.heading,
          heading: error.heading,
          lines: [error.message],
        }),
      );
      return;
    }

    console.error("Error verifying patron:", error);
    res.status(500).send(
      renderResultPage({
        title: "Something went wrong",
        heading: "We couldn't finish verifying your account",
        lines: [
          "Please try the link again, or contact library staff if this keeps happening.",
        ],
      }),
    );
  }
});

async function promoteTempIdToPermanent(
  token: string,
  assignedUID: string,
  patronAuthUid: string,
) {
  try {
    const bucket = storage.bucket();
    const source = bucket.file(`ids_temp/${token}.webp`);
    const [exists] = await source.exists();
    if (!exists) return;

    const destPath = `ids/${assignedUID}.webp`;
    const destination = bucket.file(destPath);
    await source.copy(destination);
    await source.delete();

    const downloadToken = uuidv4();
    await destination.setMetadata({
      contentType: "image/webp",
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    });

    const publicUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}` +
      `/o/${encodeURIComponent(destPath)}?alt=media&token=${downloadToken}`;

    await db.collection("patrons").doc(patronAuthUid).update({ ID: publicUrl });
  } catch (err) {
    console.error("Failed to promote temp ID file during verification:", err);
  }
}

export const verifyUpdatedEmailTokenPatron = onRequest(async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).send(
      renderResultPage({
        title: "Invalid Link",
        heading: "Missing verification token",
        lines: ["This link is incomplete. Please use the button in your email."],
      }),
    );
    return;
  }

  const tokenRef = db.collection(VERIFICATIONS).doc(token);

  try {
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
      throw new TokenError(
        "Link no longer valid",
        "This confirmation link has already been used or has expired.",
        410,
      );
    }

    const data = tokenSnap.data() as EmailUpdateToken<UpdatedEmailData>;
    if (data.expiresAt && Date.now() > data.expiresAt) {
      throw new TokenError(
        "Link expired",
        "This confirmation link has expired. Please request a new one.",
        410,
      );
    }

    const patronAuthUid = data?.userData?.UID;
    const newEmail = data?.email;
    const oldEmail = data?.userData?.oldEmail;
    if (!patronAuthUid || !newEmail) {
      throw new TokenError(
        "Link no longer valid",
        "This confirmation link is malformed. Please request a new one.",
        400,
      );
    }

    const patronRef = db.collection("patrons").doc(String(patronAuthUid));
    const patronSnap = await patronRef.get();
    if (!patronSnap.exists) {
      throw new TokenError("Patron not found", "We could not find this account.", 404);
    }

    const patronData = patronSnap.data() as PatronUserData;
    const targetName =
      `${patronData.FirstName || ""} ${patronData.LastName || ""}`.trim();

    await auth.updateUser(String(patronAuthUid), { email: newEmail });

    const batch = db.batch();
    batch.set(patronRef, { Email: newEmail }, { merge: true });
    batch.delete(tokenRef);
    await batch.commit();

    const staffPublicUID = data?.userData?.staffPublicUID || "";
    const staffName = `${data?.userData?.staffFirstName || ""} ${
      data?.userData?.staffLastName || ""
    }`.trim();

    const targetPublicUID = patronData?.UID || String(patronAuthUid);
    const actorPublicUID = staffPublicUID || targetPublicUID;

    try {
      const editLog: EditLogData = {
        case: "patronEdit",
        action: "PatronEmailUpdate",
        description: `${actorPublicUID} changed ${targetPublicUID}'s email from ${oldEmail || ""} to ${newEmail}`,
        targetUID: targetPublicUID,
        targetName,
        modifiedOn: Timestamp.now(),
        modifiedBy: staffPublicUID ? staffName : targetName,
        UID: actorPublicUID,
      };
      await writingLogsAttemptInternal(editLog);
    } catch (logErr) {
      console.warn("Failed to write PatronEmailUpdate log", logErr);
    }

    await notifyPatron(db, patronRef.id, {
      title: "Email Updated",
      content: `Your ePasig Library account email has been updated to ${newEmail}. If you did not request this change, please contact support immediately.`,
      type: "account",
    });

    res.status(200).send(
      renderResultPage({
        title: "Email Updated",
        heading: "Email Updated!",
        lines: [
          "Your ePasig Library account email has been updated.",
          `New Email: <strong>${escapeHtml(newEmail)}</strong>`,
          ...(oldEmail ? [`Previous Email: ${escapeHtml(oldEmail)}`] : []),
          "You may now close this tab and log in using your new email.",
        ],
        footerNote:
          "If you did not request this change, please contact support immediately.",
      }),
    );
  } catch (error: unknown) {
    if (error instanceof TokenError) {
      res.status(error.statusCode).send(
        renderResultPage({
          title: error.heading,
          heading: error.heading,
          lines: [error.message],
        }),
      );
      return;
    }

    console.error("Error verifying updated email token", error);
    res.status(500).send(
      renderResultPage({
        title: "Something went wrong",
        heading: "We couldn't update your email",
        lines: [
          "Please try the link again, or contact library staff if this keeps happening.",
        ],
      }),
    );
  }
});

// =====================================================================
// || Outbound mail                                                   ||
// =====================================================================

async function sendPatronVerificationEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<void> {
  const link = `${FUNCTIONS_BASE}/verifyEmailTokenPatron?token=${token}&show=true`;
  const config = smtpConfig.value();

  await createTransporter(config).sendMail({
    from: `"ePasig Library" <${config.email}>`,
    to: email,
    subject: "Verify Your Email Address",
    html: renderActionEmail({
      title: "Verify Your Email Address",
      heading: `Hi there, ${firstName || "there"}!`,
      lines: [
        "Thanks for creating an account with <strong>ePasig Library</strong>. Please verify your email address to finish setting up your account.",
      ],
      buttonLabel: "Verify Now",
      buttonLink: link,
      note: "This link expires in 5 minutes. If the button did not work, please contact our staff for assistance.",
    }),
  });
}

async function sendUpdatedEmailVerificationPatron(
  email: string,
  userData: UpdatedEmailData,
): Promise<{ token: string }> {
  const now = Date.now();
  const token = uuidv4();

  const existing = await db
    .collection(VERIFICATIONS)
    .where("email", "==", email)
    .get();
  if (!existing.empty) {
    const batch = db.batch();
    existing.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const tokenDoc: EmailUpdateToken<UpdatedEmailData> = {
    email,
    userData,
    expiresAt: now + TOKEN_TTL_MS,
    createdOn: now,
    token,
    source: "email-update-patron",
  };
  await db.collection(VERIFICATIONS).doc(token).set(tokenDoc);

  const link = `${FUNCTIONS_BASE}/verifyUpdatedEmailTokenPatron?token=${token}&show=true`;
  const config = smtpConfig.value();

  await createTransporter(config).sendMail({
    from: `"ePasig Library" <${config.email}>`,
    to: email,
    subject: "Confirm Your New Email Address",
    html: renderActionEmail({
      title: "Confirm Your New Email Address",
      heading: "Confirm Your New Email",
      lines: [
        "We received a request to change your ePasig Library account email.",
        `New Email: <strong>${escapeHtml(email)}</strong>`,
        ...(userData?.oldEmail
          ? [`Previous Email: ${escapeHtml(userData.oldEmail)}`]
          : []),
      ],
      buttonLabel: "Confirm New Email",
      buttonLink: link,
      footerNote:
        "If you didn't request this change, please ignore this email.",
    }),
  });

  return { token };
}
