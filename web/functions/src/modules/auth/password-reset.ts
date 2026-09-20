import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { notifyPatron } from "../circulation/circulation-policy";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { defineJsonSecret } from "firebase-functions/params";
import { writingLogsAttemptInternal } from "../lms/writes/writing-logs";
import { createTransporter, renderCodeEmail } from "./email-templates";
import { assertEmail, assertPasswordStrength, assertResetCode } from "./auth-validation";
import {
  LogData,
  PasswordResetCheck,
  PasswordResetData,
  UserData,
} from "./auth-types";
import { Timestamp, auth, db } from "../../core/firebase";

const smtpConfig = defineJsonSecret("SMTP_CONFIG");

const RESETS = "password_resets";
const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

// =====================================================================
// || Code storage                                                    ||
// ||                                                                 ||
// || The code is the credential for this flow, so it is treated like  ||
// || one: salted-hashed at rest, compared in constant time, capped    ||
// || on attempts, and consumed atomically when spent.                 ||
// =====================================================================

function resetDocId(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

function hashCode(code: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function codeMatches(code: string, data: PasswordResetData): boolean {
  const expected = Buffer.from(data.codeHash || "", "hex");
  const actual = Buffer.from(hashCode(code, data.salt || ""), "hex");
  if (expected.length !== actual.length || expected.length === 0) return false;
  return timingSafeEqual(expected, actual);
}

async function checkResetCode(
  email: string,
  code: string,
  consume: boolean,
): Promise<PasswordResetCheck> {
  const ref = db.collection(RESETS).doc(resetDocId(email));

  return db.runTransaction<PasswordResetCheck>(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return { status: "not-found" };

    const data = snap.data() as PasswordResetData;
    if (Date.now() > data.expiresAt) {
      transaction.delete(ref);
      return { status: "expired" };
    }

    const failedSoFar = Number(data.attempts) || 0;
    if (failedSoFar >= MAX_CODE_ATTEMPTS) {
      transaction.delete(ref);
      return { status: "locked" };
    }

    if (!codeMatches(code, data)) {
      const failed = failedSoFar + 1;
      if (failed >= MAX_CODE_ATTEMPTS) {
        transaction.delete(ref);
        return { status: "locked" };
      }
      transaction.update(ref, { attempts: failed });
      return {
        status: "invalid",
        attemptsRemaining: MAX_CODE_ATTEMPTS - failed,
      };
    }

    if (consume) transaction.delete(ref);
    return { status: "ok", uid: data.uid };
  });
}

function throwForCheck(result: PasswordResetCheck): never {
  switch (result.status) {
    case "not-found":
      throw new functions.https.HttpsError(
        "not-found",
        "No reset code is pending for this email. Please request a new one.",
      );
    case "expired":
      throw new functions.https.HttpsError(
        "deadline-exceeded",
        "That reset code has expired. Please request a new one.",
      );
    case "locked":
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Too many incorrect attempts. Please request a new reset code.",
      );
    case "invalid":
      throw new functions.https.HttpsError(
        "permission-denied",
        result.attemptsRemaining > 0
          ? `That reset code is incorrect. ${result.attemptsRemaining} attempt${
              result.attemptsRemaining === 1 ? "" : "s"
            } remaining.`
          : "That reset code is incorrect.",
      );
    default:
      throw new functions.https.HttpsError("internal", "Code check failed");
  }
}

// =====================================================================
// || Callables                                                       ||
// =====================================================================

export const requestPasswordResetCode = onCall(
  { secrets: ["SMTP_CONFIG"] },
  async (request) => {
    const email = assertEmail(request.data?.email);
    const ref = db.collection(RESETS).doc(resetDocId(email));

    const existing = await ref.get();
    if (existing.exists) {
      const data = existing.data() as PasswordResetData;
      if (Date.now() - (Number(data.createdOn) || 0) < RESEND_COOLDOWN_MS) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Please wait a moment before requesting another reset code.",
        );
      }
    }

    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error?.code === "auth/user-not-found") {
        throw new functions.https.HttpsError(
          "not-found",
          "This email is not registered in the system.",
        );
      }
      console.error("Password reset lookup failed:", err);
      throw new functions.https.HttpsError("internal", "Failed to send reset code");
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const salt = randomBytes(16).toString("hex");
    const now = Date.now();

    const record: PasswordResetData = {
      uid: userRecord.uid,
      codeHash: hashCode(code, salt),
      salt,
      attempts: 0,
      expiresAt: now + CODE_TTL_MS,
      createdOn: now,
    };
    await ref.set(record);

    const firstName = (userRecord.displayName || "").split(" ")[0] || "";
    await sendPasswordResetCode(email, firstName, code);

    return { success: true };
  },
);

export const verifyResetCodeOnly = onCall(async (request) => {
  const email = assertEmail(request.data?.email);
  const code = assertResetCode(request.data?.code);

  const result = await checkResetCode(email, code, false);
  if (result.status !== "ok") throwForCheck(result);

  return { success: true };
});

export const resetPasswordWithCode = onCall(async (request) => {
  const email = assertEmail(request.data?.email);
  const code = assertResetCode(request.data?.code);
  const newPassword = assertPasswordStrength(request.data?.newPassword);

  const result = await checkResetCode(email, code, true);
  if (result.status !== "ok") throwForCheck(result);

  const { uid } = result;
  await auth.updateUser(uid, { password: newPassword });

  const [patronSnap, staffSnap] = await Promise.all([
    db.collection("patrons").doc(uid).get(),
    db.collection("staffs").doc(uid).get(),
  ]);

  const profileSnap = patronSnap.exists
    ? patronSnap
    : staffSnap.exists
      ? staffSnap
      : null;
  const userData = (profileSnap?.data() || null) as UserData | null;

  const customUID = (userData?.UID as string) || uid;
  const userName = userData
    ? `${(userData.FirstName as string) || ""} ${(userData.LastName as string) || ""}`.trim()
    : "Unknown User";

  try {
    const logData: LogData = {
      case: "passwordReset",
      action: "PasswordReset",
      description: `Password reset for ${customUID}`,
      targetUID: customUID,
      targetName: userName,
      createdOn: Timestamp.now(),
      createdBy: userName,
      UID: customUID,
    };
    await writingLogsAttemptInternal(logData);
  } catch (logErr) {
    console.error("Failed to write password reset log:", logErr);
  }

  if (patronSnap.exists) {
    try {
      await notifyPatron(db, uid, {
        title: "Password Reset Successful",
        content:
          "Your password was successfully reset. If you didn't make this change, please contact support right away.",
        type: "account",
      });
    } catch (notifErr) {
      console.warn("Failed to write password-reset notification for", uid, notifErr);
    }
  }

  return { success: true };
});

// =====================================================================
// || Outbound mail                                                   ||
// =====================================================================

async function sendPasswordResetCode(
  email: string,
  firstName: string,
  code: string,
): Promise<void> {
  const config = smtpConfig.value();

  await createTransporter(config).sendMail({
    from: `"ePasig Library" <${config.email}>`,
    to: email,
    subject: "Your Password Reset Code",
    html: renderCodeEmail({
      title: "Your Password Reset Code",
      heading: `Hi there, ${firstName || "User"}!`,
      lines: [
        "We received a request to reset your password for your <strong>ePasig Library</strong> account.",
        "Use the 6-digit code below to reset your password. This code expires in 5 minutes.",
      ],
      code,
      note: "For security, never share this code with anyone. Your password will not change unless you enter this code and complete the process.",
    }),
  });
}
