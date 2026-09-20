import { RegistrationLogData } from "./writing-types";
import { appendLogEntry } from "./lms-log-entries";
import { db } from "../../../core/firebase";

export const logAuthAttempt = async (data: {
  email: string;
  success: boolean;
  errorMessage: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  uid?: string | null;
  userType?: string | null;
}) => {
  try {
    let firebaseUid = data.uid;

    if (!firebaseUid) {
      const patronsSnap = await db
        .collection("patrons")
        .where("Email", "==", data.email)
        .get();

      const staffsSnap = await db
        .collection("staffs")
        .where("Email", "==", data.email)
        .get();

      if (!patronsSnap.empty) {
        const docData = patronsSnap.docs[0].data();
        if (docData?.UID) firebaseUid = docData.UID;
      }
      else if (!staffsSnap.empty) {
        const docData = staffsSnap.docs[0].data();
        if (docData?.UID) firebaseUid = docData.UID;
      }
    }

    const finalUid = firebaseUid;

    const logRecord = {
      uid: finalUid,
      email: data.email,
      timestamp: new Date(),
      success: data.success,
      errorMessage: data.errorMessage,
      userAgent: data.userAgent ?? null,
      ipAddress: data.ipAddress ?? null,
      userType: data.userType ?? null,
    };

    const loginAttemptsRef = db
      .collection("lmslogs")
      .doc("login_attempts")
      .collection("entries");

    await loginAttemptsRef.add(logRecord);

  } catch (error) {
    console.error("Failed to log auth attempt:", error);
    throw error;
  }
};

export const logPatronRegistration = async (data: RegistrationLogData) => {
  try {
    await appendLogEntry(
      db,
      "patron_register",
      "patron_register",
      "PTRN_REGIS_",
      () => ({
        Action: data.action,
        Description: data.description,
        CreatedBy: data.createdBy,
        CreatedOn: data.createdOn,
        TargetName: data.targetName,
        TargetUID: data.targetUID,
        UID: data.UID,
      }),
    );
  } catch (error) {
    console.error("Failed to log patron registration:", error);
    throw error;
  }
};

export const logPasswordReset = async (data: RegistrationLogData) => {
  try {
    await appendLogEntry(
      db,
      "password_reset",
      "password_reset_log",
      "PSWD_RESET_",
      () => ({
        Action: data.action,
        Description: data.description,
        CreatedBy: data.createdBy,
        CreatedOn: data.createdOn,
        TargetName: data.targetName,
        TargetUID: data.targetUID,
        UID: data.targetUID,
      }),
    );
  } catch (error) {
    console.error("Failed to log password reset:", error);
    throw error;
  }
};
