import { toMillis } from "../../../../core/time";
import { CollectionCard, CollectionCopy, CollectionOtherCopy, CollectionRecord, TableCollection, TableCollectionCopy } from "../fetching-types";


export type FirestoreData = Record<string, unknown>;


export const TABLE_FIELDS = [
  "UID",
  "CollectionTitle",
  "SecondTitle",
  "Edition",
  "Volume",
  "MainAuthor",
  "CollectionImage",
  "CallNumber",
  "ClassCode",
  "MaterialType",
  "ISBN10",
  "ISBN13",
  "Description",
  "TitleDescription",
  "Status",
  "CreatedBy",
  "LastModifiedBy",
  "CreatedOn",
  "ModifiedOn",
  "PublicationYear",
  "CopyrightYear",
  "Copies",
  "OtherCopies",
] as const;


export function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}


export function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text) : [];
}


function mapCopy(value: unknown): CollectionCopy {
  const copy = (value || {}) as FirestoreData;
  return {
    Accession: text(copy.Accession),
    LibraryLocation: text(copy.LibraryLocation),
    Section: text(copy.Section),
    CreatedBy: text(copy.CreatedBy),
    CreatedOn: toMillis(copy.CreatedOn),
    LastModifiedBy: text(copy.LastModifiedBy || copy.ModifiedBy),
    ModifiedOn: toMillis(copy.ModifiedOn),
    LastBorrowedBy: text(copy.LastBorrowedBy),
    LastBorrowedDate: toMillis(copy.LastBorrowedDate),
    ForLibraryUse: !!copy.ForLibraryUse,
    Availability: text(copy.Availability) || "Available",
  };
}


function mapOtherCopy(value: unknown): CollectionOtherCopy {
  const copy = (value || {}) as FirestoreData;
  return {
    CallNumber: text(copy.CallNumber),
    LibraryLocation: text(copy.LibraryLocation),
    CreatedBy: text(copy.CreatedBy),
    CreatedOn: toMillis(copy.CreatedOn),
    ModifiedBy: text(copy.ModifiedBy),
    ModifiedOn: toMillis(copy.ModifiedOn),
    CopiesAvailable: Number(copy.CopiesAvailable ?? 0),
    Availability: text(copy.Availability) || "Available",
  };
}


export function mapCollection(
  doc: FirebaseFirestore.DocumentSnapshot,
): CollectionRecord {
  const x = (doc.data() || {}) as FirestoreData;
  const copies = Array.isArray(x.Copies) ? x.Copies : [];
  const otherCopies = Array.isArray(x.OtherCopies) ? x.OtherCopies : [];

  return {
    id: doc.id,
    UID: text(x.UID),
    Acquisition: text(x.Acquisition),
    Author: text(x.Author),
    CallNumber: text(x.CallNumber),
    CollectionTitle: text(x.CollectionTitle),
    SecondTitle: text(x.SecondTitle),
    Edition: text(x.Edition),
    Volume: text(x.Volume),
    MainAuthor: text(x.MainAuthor),
    JointAuthor: text(x.JointAuthor),
    ClassCode: text(x.ClassCode),
    MaterialType: text(x.MaterialType),
    ISBN: text(x.ISBN),
    ISBN10: text(x.ISBN10),
    ISBN13: text(x.ISBN13),
    Description: text(x.Description || x.TitleDescription),
    TitleDescription: text(x.TitleDescription),
    CostPrice: text(x.CostPrice),
    IncludesSummary: text(x.IncludesSummary),
    CuttersTable: text(x.CuttersTable),
    DateReceived: text(x.DateReceived),
    Donor: text(x.Donor),
    Inclusion: text(x.Inclusion),
    PageCount: text(x.PageCount),
    PrePage: text(x.PrePage),
    PublicationDate: text(x.PublicationDate),
    PublicationPlace: text(x.PublicationPlace),
    PublicationYear: text(x.PublicationYear),
    CopyrightYear: text(x.CopyrightYear),
    Publisher: text(x.Publisher),
    SeriesTitle: text(x.SeriesTitle),
    GeneralNote: text(x.GeneralNote),
    Size: text(x.Size),
    Status: text(x.Status),
    CollectionImage: text(x.CollectionImage),
    RelatedNames: list(x.RelatedNames),
    Subjects: list(x.Subjects),
    BorrowCount: Number(x.BorrowCount || 0),
    LastBorrowedDate: text(x.LastBorrowedDate),
    CreatedOn: toMillis(x.CreatedOn),
    ModifiedOn: toMillis(x.ModifiedOn),
    CreatedBy: text(x.CreatedBy),
    LastModifiedBy: text(x.LastModifiedBy),
    Copies: copies.map(mapCopy),
    OtherCopies: otherCopies.map(mapOtherCopy),
  };
}


function mapTableCopy(value: unknown): TableCollectionCopy {
  const copy = (value || {}) as FirestoreData;
  return {
    Accession: text(copy.Accession),
    LibraryLocation: text(copy.LibraryLocation),
  };
}


function tableCopies(value: unknown): TableCollectionCopy[] {
  return Array.isArray(value) ? value.map(mapTableCopy) : [];
}


export function mapCollectionForTable(
  doc: FirebaseFirestore.DocumentSnapshot,
): TableCollection {
  const x = (doc.data() || {}) as FirestoreData;
  return {
    id: doc.id,
    UID: text(x.UID),
    CollectionTitle: text(x.CollectionTitle),
    SecondTitle: text(x.SecondTitle),
    Edition: text(x.Edition),
    Volume: text(x.Volume),
    MainAuthor: text(x.MainAuthor),
    CollectionImage: text(x.CollectionImage),
    CallNumber: text(x.CallNumber),
    ClassCode: text(x.ClassCode),
    MaterialType: text(x.MaterialType),
    ISBN10: text(x.ISBN10),
    ISBN13: text(x.ISBN13),
    Description: text(x.Description || x.TitleDescription),
    Status: text(x.Status),
    CreatedBy: text(x.CreatedBy),
    LastModifiedBy: text(x.LastModifiedBy),
    CreatedOn: toMillis(x.CreatedOn),
    ModifiedOn: toMillis(x.ModifiedOn),
    Copies: tableCopies(x.Copies),
    OtherCopies: tableCopies(x.OtherCopies),
  };
}


export function mapCollectionCard(
  doc: FirebaseFirestore.DocumentSnapshot,
): CollectionCard {
  const x = (doc.data() || {}) as FirestoreData;
  return {
    id: doc.id,
    CollectionTitle: text(x.CollectionTitle),
    CollectionImage: text(x.CollectionImage),
    MainAuthor: text(x.MainAuthor),
    Description: text(x.Description || x.TitleDescription),
    ClassCode: text(x.ClassCode),
    BorrowCount: Number(x.BorrowCount || 0),
    IsArchived: Boolean(x.IsArchived),
  };
}
