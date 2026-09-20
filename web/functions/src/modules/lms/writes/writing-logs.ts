import * as functions from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { logPasswordReset, logPatronRegistration } from "./writing-auth";
import {
  logPatronLMSRegistration,
  logEditPatronInformation,
  logPatronArchiveUnarchive,
  logVerifyPatronID,
} from "./writing-lms-patron";
import {
  logStaffLMSRegistration,
  logEditStaffInformation,
  logStaffArchiveUnarchive,
} from "./writing-lms-staff";
import {
  logAddCollectionRecord,
  logEditCollectionInformation,
  logCollectionArchiveUnarchive,
  logCollectionConfigure,
} from "./writing-lms-collection";
import {
  logCheckout,
  logCheckin,
  logRenewal,
  logReservationRequest,
  logHold,
} from "./writing-lms-circulation";
import { LogRequest } from "./writing-types";

// =======================================================
// || Callable to write logs under lmslogs on firestore ||
// =======================================================

const SERVER_ONLY_CASES = new Set([
  "patronRegistration",
  "patronLMSRegistration",
  "staffLMSRegistration",
  "passwordReset",
  "loginAttempt",
  "patronEdit",
  "patronArchiveUnarchive",
  "verifyPatronID",
  "staffEdit",
  "staffArchiveUnarchive",
  "collectionAdd",
  "collectionEdit",
  "collectionArchiveUnarchive",
  "collectionConfigure",
  "checkout",
  "checkin",
  "renewal",
  "reservation",
  "hold",
]);

export async function writingLogsAttemptInternal(data: LogRequest) {
  if (!data || !data.case) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "No data or case provided",
    );
  }
  switch (data.case) {
    case "patronRegistration":
      await logPatronRegistration(data);
      return { status: "logged", case: "patronRegistration", success: true };
    case "passwordReset":
      await logPasswordReset(data);
      return { status: "logged", case: "passwordReset", success: true };


    case "patronLMSRegistration":
      await logPatronLMSRegistration(data);
      return { status: "logged", case: "patronLMSRegistration", success: true };
    case "patronEdit":
      await logEditPatronInformation(data);
      return { status: "logged", case: "patronEdit", success: true };
    case "patronArchiveUnarchive":
      await logPatronArchiveUnarchive(data);
      return { status: "logged", case: "patronArchiveUnarchive", success: true };
    case "verifyPatronID":
      await logVerifyPatronID(data);
      return { status: "logged", case: "verifyPatronID", success: true };


    case "staffLMSRegistration":
      await logStaffLMSRegistration(data);
      return { status: "logged", case: "staffLMSRegistration", success: true };
    case "staffEdit":
      await logEditStaffInformation(data);
      return { status: "logged", case: "staffEdit", success: true };
    case "staffArchiveUnarchive":
      await logStaffArchiveUnarchive(data);
      return { status: "logged", case: "staffArchiveUnarchive", success: true };


    case "collectionAdd":
      await logAddCollectionRecord(data);
      return { status: "logged", case: "collectionAdd", success: true };
    case "collectionEdit":
      await logEditCollectionInformation(data);
      return { status: "logged", case: "collectionEdit", success: true };
    case "collectionArchiveUnarchive":
      await logCollectionArchiveUnarchive(data);
      return { status: "logged", case: "collectionArchiveUnarchive", success: true };
    case "collectionConfigure":
      await logCollectionConfigure(data);
      return { status: "logged", case: "collectionConfigure", success: true };


    case "checkout":
      await logCheckout(data);
      return { status: "logged", case: "checkout", success: true };
    case "checkin":
      await logCheckin(data);
      return { status: "logged", case: "checkin", success: true };
    case "renewal":
      await logRenewal(data);
      return { status: "logged", case: "renewal", success: true };
    case "reservation":
      await logReservationRequest(data);
      return { status: "logged", case: "reservation", success: true };
    case "hold":
      await logHold(data);
      return { status: "logged", case: "hold", success: true };




    default:
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Unsupported internal case: ${(data as { case: string }).case}`,
      );
  }
}

export const writingLogsAttempt = onCall(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const data = request.data;
    if (!data) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "No data provided",
      );
    }
    const { case: caseType } = data;

    if (SERVER_ONLY_CASES.has(caseType)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        `"${caseType}" logs are written by the server only.`,
      );
    }

    try {
      switch (caseType) {
        case "collectionAdd":
          await logAddCollectionRecord(data);
          return { status: "logged", case: "collectionAdd", success: true };
        case "collectionEdit":
          await logEditCollectionInformation(data);
          return { status: "logged", case: "collectionEdit", success: true };
        case "collectionArchiveUnarchive":
          await logCollectionArchiveUnarchive(data);
          return { status: "logged", case: "collectionArchiveUnarchive", success: true };
        case "collectionConfigure":
          await logCollectionConfigure(data);
          return { status: "logged", case: "collectionConfigure", success: true };




        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            `Unknown case: ${caseType}`,
          );
      }
    } catch (error) {
      console.error(`Error in writingLogsAttempt case ${caseType}:`, error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        `Failed to process case ${caseType}`,
      );
    }
  },
);
