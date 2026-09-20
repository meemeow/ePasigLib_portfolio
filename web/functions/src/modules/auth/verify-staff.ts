import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { FUNCTIONS_BASE_URL } from "../../config/runtime";
import { v4 as uuidv4 } from "uuid";
import { defineJsonSecret, defineSecret } from "firebase-functions/params";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import { verifyCaptchaToken } from "../../core/captcha";
import { formatToE164 } from "../../core/coerce";
import { requireStaffActor } from "../../core/guards";
import { resolveStaffPermissions } from "../users/staff-permissions";
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
  PendingRegistration,
  StaffRegistrationInput,
  StaffUserData,
  UpdatedStaffEmailData,
} from "./auth-types";
import { Timestamp, auth, db } from "../../core/firebase";

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

interface NormalizedStaff {
  email: string;
  password: string;
  displayName: string;
  jobTitle: string;
  profile: Record<string, unknown>;
}

function normalizeStaffInput(raw: unknown): NormalizedStaff {
  if (!raw || typeof raw !== "object") invalid("Missing registration details");
  const input = raw as StaffRegistrationInput;

  const FirstName = assertName(input.FirstName, "First name");
  const LastName = assertName(input.LastName, "Last name");
  const email = assertEmail(input.Email);
  const password = assertPasswordStrength(input.Password);
  const JobTitle = requiredString(input.JobTitle, "Job title");

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
    JobTitle,
    Role: "Staff",
    Status: "Active",
    ...resolveStaffPermissions(input as unknown as Record<string, unknown>, JobTitle),
  };

  return {
    email,
    password,
    displayName: `${FirstName} ${LastName}`,
    jobTitle: JobTitle,
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

async function reserveStaffCode(jobTitle: string): Promise<string> {
  const upper = jobTitle.toUpperCase();
  const prefix = upper.includes("AIDE")
    ? "AIDE"
    : upper.includes("ADMIN")
      ? "ADMIN"
      : "LIBRARIAN";

  const counterRef = db.collection("metadata").doc("staff_code_counter");
  const fieldName = `${prefix}nextUID`;

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(counterRef);
    const stored = (snap.data() as Record<string, number> | undefined)?.[fieldName];
    const current = typeof stored === "number" && stored > 0 ? stored : 1;

    transaction.set(counterRef, { [fieldName]: current + 1 }, { merge: true });
    return `${prefix}${String(current).padStart(2, "0")}`;
  });
}

// =====================================================================
// || Callables                                                       ||
// =====================================================================

export const requestStaffRegistration = onCall(
  { secrets: ["RECAPTCHA_SECRET_KEY", "SMTP_CONFIG"] },
  async (req) => {
    const actor: ActorIdentity = await requireStaffActor(
      req.auth?.uid,
      "StaffAdd",
    );
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

    const normalized = normalizeStaffInput(userData);

    const pendingDoc = await findPendingByEmail(normalized.email);
    let existingAuthUid: string | undefined;
    let staffCode: string | undefined;

    if (pendingDoc) {
      const pending = pendingDoc.data() as PendingRegistration;
      if (Date.now() - (Number(pending.createdOn) || 0) < RESEND_COOLDOWN_MS) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Please wait a moment before requesting another verification email.",
        );
      }
      existingAuthUid = pending.authUid;
      staffCode = pending.staffCode;
    }

    const authUid = await provisionAuthUser({
      email: normalized.email,
      password: normalized.password,
      displayName: normalized.displayName,
      existingAuthUid,
    });

    if (!staffCode) {
      staffCode = await reserveStaffCode(normalized.jobTitle);
    }

    const now = Date.now();
    const token = uuidv4();

    const tokenDoc: PendingRegistration = {
      flow: "staff-lms",
      email: normalized.email,
      authUid,
      profile: normalized.profile,
      createdByUID: actor.publicUID,
      createdByName: actor.fullName,
      staffCode,
      expiresAt: now + TOKEN_TTL_MS,
      createdOn: now,
      token,
    };

    await db.collection(VERIFICATIONS).doc(token).set(tokenDoc);

    if (pendingDoc) {
      await pendingDoc.ref.delete().catch((err) => {
        console.error("Failed to delete superseded pending registration:", err);
      });
    }

    await sendStaffVerificationEmail(
      normalized.email,
      normalized.profile.FirstName as string,
      token,
    );

    return { success: true, staffCode, token };
  },
);

export const requestUpdatedEmailVerificationStaff = onCall(
  { secrets: ["SMTP_CONFIG"] },
  async (req) => {
    const actor = await requireStaffActor(req.auth?.uid, "StaffEdit");
    const { uid, newEmail } = req.data || {};
    if (!uid || !newEmail) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "uid and newEmail are required",
      );
    }

    const email = assertEmail(newEmail);

    let staffRef = db.collection("staffs").doc(String(uid));
    let staffSnap = await staffRef.get();
    if (!staffSnap.exists) {
      const byField = await db
        .collection("staffs")
        .where("UID", "==", String(uid))
        .limit(1)
        .get();
      if (byField.empty) {
        throw new functions.https.HttpsError("not-found", "Staff not found");
      }
      staffRef = byField.docs[0].ref;
      staffSnap = byField.docs[0];
    }

    const staffData = (staffSnap.data() || {}) as StaffUserData;

    try {
      const existing = await auth.getUserByEmail(email);
      if (existing && existing.uid !== staffRef.id) {
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

    const updatedEmailData: UpdatedStaffEmailData = {
      UID: staffRef.id,
      oldEmail: staffData.Email || null,
      staffPublicUID: staffData.UID || null,
      staffName: `${staffData.FirstName || ""} ${staffData.LastName || ""}`.trim(),
      callerPublicUID: actor.publicUID || null,
      callerFirstName: actor.firstName || null,
      callerLastName: actor.lastName || null,
    };

    const { token } = await sendUpdatedEmailVerificationStaff(
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

export const verifyEmailTokenStaff = onRequest(async (req, res) => {
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
          "This verification link has expired. Please ask an administrator to register you again.",
          410,
        );
      }

      const staffRef = db.collection("staffs").doc(pending.authUid);
      const staffSnap = await transaction.get(staffRef);

      if (staffSnap.exists) {
        transaction.delete(tokenRef);
        return {
          pending,
          assignedUID: (staffSnap.data() as StaffUserData)?.UID || "",
          alreadyExisted: true,
        };
      }

      const counterRef = db.collection("metadata").doc("staff_uid_counter");
      const counterSnap = await transaction.get(counterRef);
      const nextUID = readCounter(counterSnap);
      const assignedUID = `S${String(nextUID).padStart(7, "0")}`;

      transaction.set(staffRef, {
        ...pending.profile,
        UID: assignedUID,
        StaffCode: pending.staffCode || "",
        CreatedOn: Timestamp.now(),
        CreatedBy: pending.createdByName,
      });
      transaction.set(counterRef, { nextUID: nextUID + 1 }, { merge: true });
      transaction.delete(tokenRef);

      return { pending, assignedUID, alreadyExisted: false };
    });

    const { pending, assignedUID, alreadyExisted } = outcome;

    if (alreadyExisted) {
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

    const staffName =
      `${pending.profile.FirstName || ""} ${pending.profile.LastName || ""}`.trim();

    const logData: LogData = {
      case: "staffLMSRegistration",
      action: "StaffAdd",
      description: `${assignedUID} added by ${pending.createdByUID}`,
      targetUID: assignedUID,
      targetName: staffName,
      createdOn: Timestamp.now(),
      createdBy: pending.createdByName,
      UID: pending.createdByUID,
    };

    try {
      await writingLogsAttemptInternal(logData);
    } catch (logErr) {
      console.error("Failed to write staff registration log:", logErr);
    }


    res.status(200).send(
      renderResultPage({
        title: "Account Created",
        heading: "Staff Email Verified!",
        lines: [
          "Your staff account has been successfully created and your email is now verified.",
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

    console.error("Error verifying staff user:", error);
    res.status(500).send(
      renderResultPage({
        title: "Something went wrong",
        heading: "We couldn't finish verifying your account",
        lines: [
          "Please try the link again, or contact an administrator if this keeps happening.",
        ],
      }),
    );
  }
});

export const verifyUpdatedEmailTokenStaff = onRequest(async (req, res) => {
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

    const data = tokenSnap.data() as EmailUpdateToken<UpdatedStaffEmailData>;
    if (data.expiresAt && Date.now() > data.expiresAt) {
      throw new TokenError(
        "Link expired",
        "This confirmation link has expired. Please request a new one.",
        410,
      );
    }

    const staffAuthUid = data?.userData?.UID;
    const newEmail = data?.email;
    const oldEmail = data?.userData?.oldEmail;
    if (!staffAuthUid || !newEmail) {
      throw new TokenError(
        "Link no longer valid",
        "This confirmation link is malformed. Please request a new one.",
        400,
      );
    }

    const staffRef = db.collection("staffs").doc(String(staffAuthUid));
    const staffSnap = await staffRef.get();
    if (!staffSnap.exists) {
      throw new TokenError("Staff not found", "We could not find this account.", 404);
    }

    const staffData = staffSnap.data() as StaffUserData;
    const targetName =
      `${staffData.FirstName || ""} ${staffData.LastName || ""}`.trim() ||
      data?.userData?.staffName ||
      "";

    await auth.updateUser(String(staffAuthUid), { email: newEmail });

    const batch = db.batch();
    batch.set(staffRef, { Email: newEmail }, { merge: true });
    batch.delete(tokenRef);
    await batch.commit();

    const callerPublicUID = data?.userData?.callerPublicUID || "";
    const callerName = `${data?.userData?.callerFirstName || ""} ${
      data?.userData?.callerLastName || ""
    }`.trim();

    const targetPublicUID = staffData?.UID || String(staffAuthUid);
    const actorPublicUID = callerPublicUID || targetPublicUID;

    try {
      const editLog: EditLogData = {
        case: "staffEdit",
        action: "StaffEmailUpdate",
        description: `${actorPublicUID} changed ${targetPublicUID}'s email from ${oldEmail || ""} to ${newEmail}`,
        targetUID: targetPublicUID,
        targetName,
        modifiedOn: Timestamp.now(),
        modifiedBy: callerPublicUID ? callerName : targetName,
        UID: actorPublicUID,
      };
      await writingLogsAttemptInternal(editLog);
    } catch (logErr) {
      console.warn("Failed to write StaffEmailUpdate log", logErr);
    }


    res.status(200).send(
      renderResultPage({
        title: "Email Updated",
        heading: "Email Updated!",
        lines: [
          "Your ePasig Library staff account email has been updated.",
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

    console.error("Error verifying updated staff email token", error);
    res.status(500).send(
      renderResultPage({
        title: "Something went wrong",
        heading: "We couldn't update your email",
        lines: [
          "Please try the link again, or contact an administrator if this keeps happening.",
        ],
      }),
    );
  }
});

// =====================================================================
// || Outbound mail                                                   ||
// =====================================================================

async function sendStaffVerificationEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<void> {
  const link = `${FUNCTIONS_BASE}/verifyEmailTokenStaff?token=${token}&show=true`;
  const config = smtpConfig.value();

  await createTransporter(config).sendMail({
    from: `"ePasig Library" <${config.email}>`,
    to: email,
    subject: "Verify Your Email Address",
    html: renderActionEmail({
      title: "Verify Your Email Address",
      heading: `Hi there, ${firstName || "there"}!`,
      lines: [
        "A staff account has been created for you at <strong>ePasig Library</strong>. Please verify your email address to activate it.",
      ],
      buttonLabel: "Verify Now",
      buttonLink: link,
      note: "This link expires in 5 minutes. If the button did not work, please contact your administrator for assistance.",
    }),
  });
}

async function sendUpdatedEmailVerificationStaff(
  email: string,
  userData: UpdatedStaffEmailData,
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

  const tokenDoc: EmailUpdateToken<UpdatedStaffEmailData> = {
    email,
    userData,
    expiresAt: now + TOKEN_TTL_MS,
    createdOn: now,
    token,
    source: "email-update-staff",
  };
  await db.collection(VERIFICATIONS).doc(token).set(tokenDoc);

  const link = `${FUNCTIONS_BASE}/verifyUpdatedEmailTokenStaff?token=${token}&show=true`;
  const config = smtpConfig.value();

  await createTransporter(config).sendMail({
    from: `"ePasig Library" <${config.email}>`,
    to: email,
    subject: "Confirm Your New Email Address",
    html: renderActionEmail({
      title: "Confirm Your New Email Address",
      heading: "Confirm Your New Email",
      lines: [
        "We received a request to change your ePasig Library staff account email.",
        `New Email: <strong>${escapeHtml(email)}</strong>`,
        ...(userData?.oldEmail
          ? [`Previous Email: ${escapeHtml(userData.oldEmail)}`]
          : []),
      ],
      buttonLabel: "Confirm New Email",
      buttonLink: link,
      footerNote: "If you didn't request this change, please ignore this email.",
    }),
  });

  return { token };
}
