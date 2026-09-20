import { HttpsError } from "firebase-functions/v2/https";

/**
 * Named constructors for the HttpsError codes this project actually raises.
 * They read as the failure they describe and keep the code strings in one place.
 */
export const badRequest = (message: string): HttpsError =>
  new HttpsError("invalid-argument", message);

export const unauthenticated = (message = "Auth required"): HttpsError =>
  new HttpsError("unauthenticated", message);

export const forbidden = (message: string): HttpsError =>
  new HttpsError("permission-denied", message);

export const notFound = (message: string): HttpsError =>
  new HttpsError("not-found", message);

export const conflict = (message: string): HttpsError =>
  new HttpsError("failed-precondition", message);

export const internal = (message: string): HttpsError =>
  new HttpsError("internal", message);

export { HttpsError };
