import { onCall } from "firebase-functions/v2/https";
import { HttpsError, badRequest, internal } from "./errors";

export type CaseHandler = (
  data: any,
  authUid: string | null,
) => unknown | Promise<unknown>;

/**
 * The callable shape this API uses throughout: one function per verb, with the
 * payload's `case` picking the handler. Unknown cases and thrown errors are
 * logged and reported the same way for every verb.
 */
export const createCaseRouter = (
  name: string,
  handlers: Record<string, CaseHandler>,
) =>
  onCall({ timeoutSeconds: 60, memory: "256MiB" }, async (request) => {
    const data = request.data;
    if (!data) throw badRequest("No data provided");

    const caseType = data.case;
    try {
      const handler = handlers[caseType];
      if (!handler) throw badRequest(`Unknown case: ${caseType}`);
      return await handler(data, request.auth?.uid || null);
    } catch (error) {
      console.error(`Error in ${name} case ${caseType}:`, error);
      if (error instanceof HttpsError) throw error;
      const message =
        error instanceof Error && error.message ? error.message : String(error);
      throw internal(`Failed to process case ${caseType}: ${message}`);
    }
  });
