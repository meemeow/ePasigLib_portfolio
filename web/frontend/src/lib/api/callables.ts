import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/**
 * Bindings for the callable routers the backend exposes. Each one takes a
 * payload whose `case` picks the handler, so a feature imports the router it
 * needs rather than re-deriving the binding.
 */
export const callAddRecord = httpsCallable(functions, "addRecordAttempt");
export const callEditRecord = httpsCallable(functions, "editRecordAttempt");
export const callArchiveRecord = httpsCallable(
  functions,
  "archiveUnarchiveRecordAttempt",
);
export const callCirculation = httpsCallable(
  functions,
  "circulationRecordAttempt",
);
export const callSearchData = httpsCallable(functions, "searchDataAttempt");
