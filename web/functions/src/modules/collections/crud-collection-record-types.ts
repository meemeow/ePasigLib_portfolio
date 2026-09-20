import * as admin from "firebase-admin";

type WrittenTimestamp =
  | admin.firestore.Timestamp
  | admin.firestore.FieldValue;

export interface CollectionDocument {
  CollectionTitle: string;
  SecondTitle: string;
  TitleDescription: string;
  MainAuthor: string;
  JointAuthor: string;
  Author: string;
  Description: string;

  ClassCode: string;
  CallNumber: string;
  CuttersTable: string;
  Subjects: string[];
  RelatedNames: string[];
  CopyrightYear: string;

  Publisher: string;
  PublicationPlace: string;
  PublicationYear: string;
  SeriesTitle: string;
  GeneralNote: string;

  Size: string;
  Inclusion: string;
  DateReceived: string;
  Acquisition: "" | "Purchased" | "Donated";
  CostPrice: string | number;
  Donor: string;

  MaterialType: string;
  Edition: string;
  Volume: string;
  ISBN13: string;
  ISBN10: string;
  PageCount: string;
  PrePage: string;
  CollectionImage: string;

  UID: string;
  CreatedBy: string | null;
  LastModifiedBy: string | null;
  CreatedOn: WrittenTimestamp;
  ModifiedOn: WrittenTimestamp;
  LastBorrowedDate: string;
  Status: "Available" | "Archived" | "Borrowed";
}

export interface AddCollectionRequest {
  case?: string;
  CollectionTitle?: string;
  MainAuthor?: string;
  ISBN10?: string;
  ISBN13?: string;
  CostPrice?: string | number;
  [key: string]: unknown;
}

export interface AddCollectionResult {
  success: true;
  id: string;
  UID: string;
  CreatedBy: string | null;
}

export interface UpdateCollectionImageRequest {
  docId?: string;
  id?: string;
  imageUrl?: string;
}

export interface EditCollectionInformationRequest {
  targetUID?: string;
  profileData?: Record<string, unknown>;
}

export interface EditCollectionInformationResult {
  status: "updated";
  case: "editCollectionInformation";
  success: true;
  updatedFields: string[];
}

export type CollectionArchiveAction = "archive" | "unarchive";

export interface CollectionArchiveRequest {
  targetUID?: string;
  action?: string;
}

export interface CollectionArchiveResult {
  success: true;
  message: string;
  collectionUID: string;
  previousStatus: string;
  newStatus: string;
}


export interface ActorNameFields {
  UID?: string;
  FirstName?: string;
  LastName?: string;
}
