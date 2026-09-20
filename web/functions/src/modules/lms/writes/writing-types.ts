import * as admin from "firebase-admin";


export type RegistrationLogCase =
  | "patronRegistration"
  | "passwordReset"
  | "patronLMSRegistration"
  | "staffLMSRegistration";

export interface RegistrationLogData {
  case: RegistrationLogCase;
  action: string;
  description: string;
  targetUID: string | null;
  targetName: string;
  createdOn: admin.firestore.Timestamp;
  createdBy: string;
  UID: string;
  authUid?: string | null;
}

export interface EditLogData {
  case: "patronEdit" | "staffEdit";
  action: string;
  description: string;
  modifiedBy: string;
  modifiedOn: admin.firestore.Timestamp;
  targetName: string;
  targetUID: string;
  UID: string;
}

export interface ArchiveLogData {
  case: "patronArchiveUnarchive" | "staffArchiveUnarchive";
  action: string;
  archiveAction: "archive" | "unarchive";
  actorName: string;
  description: string;
  targetName: string;
  targetUID: string;
  UID: string;
}

export interface VerifyLogData {
  case: "verifyPatronID";
  action: string;
  description: string;
  processedBy: string;
  processedOn: admin.firestore.Timestamp;
  remarks: string;
  status: "Approved" | "Rejected";
  targetName: string;
  targetUID: string;
  UID: string;
}

export type CirculationLogCase =
  | "checkout"
  | "checkin"
  | "renewal"
  | "reservation"
  | "hold";

export interface CirculationBookEntry {
  BookID: string;
  Accession: string;
  CollectionTitle: string;
  MainAuthor?: string;
}

export interface CirculationLogData {
  case: CirculationLogCase;
  action: string;
  description: string;
  processedBy: string;
  processedOn?: admin.firestore.Timestamp;
  targetName: string;
  targetUID: string;
  UID: string;

  type: string;
  status: string;

  accession?: string;
  collectionTitle?: string;
  collectionUID?: string;
  books?: CirculationBookEntry[];

  dueDate?: admin.firestore.Timestamp | null;
  newDueDate?: admin.firestore.Timestamp | null;
  checkinDate?: admin.firestore.Timestamp | null;
  purpose?: string;

  remarks?: string;
  violations?: string;
  hasRenewed?: boolean;
  daysOfExtension?: number | null;
  borrowID?: string;
  originalCheckoutTransaction?: string | null;
}

export type LegacyLogCase =
  | "collectionAdd"
  | "collectionEdit"
  | "collectionArchiveUnarchive"
  | "collectionConfigure"
  | "renewalRequests"
  | "bookRequests";

export interface LegacyLogData {
  case: LegacyLogCase;
  [key: string]: unknown;
}

export type LogRequest =
  | RegistrationLogData
  | EditLogData
  | ArchiveLogData
  | VerifyLogData
  | CirculationLogData
  | LegacyLogData;
