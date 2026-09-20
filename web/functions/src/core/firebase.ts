import * as admin from "firebase-admin";

/**
 * Single Firebase entry point. `index.ts` calls `initializeApp()` before any
 * feature module is required, so grabbing the handles here — rather than
 * re-deriving them in every file — is safe and keeps one instance in play.
 */
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

export const serverTimestamp = (): FirebaseFirestore.FieldValue =>
  FieldValue.serverTimestamp();

export const increment = (by: number): FirebaseFirestore.FieldValue =>
  FieldValue.increment(by);

export const now = (): admin.firestore.Timestamp => Timestamp.now();
