import * as admin from "firebase-admin";

export type CopyList = "Copies" | "OtherCopies";

export type CopyArchiveAction = "archive" | "unarchive";

export type CopyAvailability =
  | "Available"
  | "Archived"
  | "Pending"
  | "Reserved"
  | "Borrowed";

export interface PkcCopy {
  Accession: string;
  LibraryLocation: string;
  Section: string;
  CreatedBy: string;
  CreatedOn: admin.firestore.Timestamp;
  LastModifiedBy: string;
  ModifiedOn: admin.firestore.Timestamp;
  LastBorrowedBy: string;
  LastBorrowedDate: string;
  Availability: CopyAvailability;
  ForLibraryUse: boolean;
}

export interface OtherLibraryCopy {
  CallNumber: string;
  LibraryLocation: string;
  CopiesAvailable: number;
  CreatedBy: string;
  CreatedOn: admin.firestore.Timestamp;
  ModifiedBy: string;
  ModifiedOn: admin.firestore.Timestamp;
  Availability: CopyAvailability;
}

export type StoredCopy = Partial<PkcCopy & OtherLibraryCopy> &
  Record<string, unknown>;

export interface CopyRequestBase {
  collectionUID?: string;
  collectionTitle?: string;
  isOtherCopy?: boolean;
}

export interface AddCopyRequest extends CopyRequestBase {
  accession?: string;
  libraryLocation?: string;
  section?: string;
  forLibraryUse?: boolean;
  callNumber?: string;
  copiesAvailable?: number | string;
}

export interface EditCopyRequest extends AddCopyRequest {
  copyIndex?: number;
  expectedKey?: string;
}

export interface ArchiveCopyRequest extends CopyRequestBase {
  copyIndex?: number;
  action?: string;
  expectedKey?: string;
  accession?: string;
}

export interface CopyMutationResult {
  success: true;
  message: string;
}
