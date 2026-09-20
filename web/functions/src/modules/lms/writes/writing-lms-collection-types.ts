import * as admin from "firebase-admin";


type WrittenTimestamp =
  | admin.firestore.Timestamp
  | admin.firestore.FieldValue;

interface CollectionLogBase {
  Action: string;
  Description: string;
  UID: string;
}

export interface CollectionAddLogRecord extends CollectionLogBase {
  Action: "CatalogingAdd" | string;
  Description: string;
  TargetUID: string;
  TargetCollection: string;
  CreatedOn: WrittenTimestamp;
  CreatedBy: string;
}

export interface CollectionEditLogRecord extends CollectionLogBase {
  Action: "CatalogingEdit" | string;
  Description: string;
  TargetUID: string;
  TargetCollection: string;
  ModifiedOn: WrittenTimestamp;
  ModifiedBy: string;
}

export interface CollectionArchiveLogRecord extends CollectionLogBase {
  Action: "CatalogingArchive" | "CatalogingUnarchive";
  Description: string;
  TargetUID: string;
  TargetCollection: string;
  ArchivedBy?: string;
  ArchivedOn?: WrittenTimestamp;
  UnarchivedBy?: string;
  UnarchivedOn?: WrittenTimestamp;
}

export interface CollectionConfigureLogRecord extends CollectionLogBase {
  Action: "CatalogingAdd" | "CatalogingEdit" | "CatalogingArchive" | string;
  Description: string;
  TargetName: string;
  ModifiedOn: WrittenTimestamp;
  ModifiedBy: string;
}
