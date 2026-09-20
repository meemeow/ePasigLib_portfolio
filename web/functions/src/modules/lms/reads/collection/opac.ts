import { toMillis } from "../../../../core/time";
import { db } from "../../../../core/firebase";
import { OpacCollection, OpacCopy } from "../fetching-types";
import { FirestoreData, list, text } from "./mappers";


// ==========================================
// || THE PUBLIC CATALOGUE                  ||
// ==========================================

const OPAC_FIELDS = [
  "CollectionTitle",
  "MainAuthor",
  "CollectionImage",
  "Description",
  "TitleDescription",
  "ClassCode",
  "MaterialType",
  "Publisher",
  "PublicationYear",
  "CopyrightYear",
  "Subjects",
  "BorrowCount",
  "Status",
  "CreatedOn",
  "Copies",
  "OtherCopies",
] as const;


function mapOpacCopy(value: unknown): OpacCopy {
  const copy = (value || {}) as FirestoreData;
  return {
    Availability: text(copy.Availability) || "Available",
    ForLibraryUse: !!copy.ForLibraryUse,
  };
}


export function mapCollectionOpac(
  doc: FirebaseFirestore.DocumentSnapshot,
): OpacCollection {
  const x = (doc.data() || {}) as FirestoreData;
  const copies = Array.isArray(x.Copies) ? x.Copies : [];
  const otherCopies = Array.isArray(x.OtherCopies) ? x.OtherCopies : [];

  return {
    id: doc.id,
    CollectionTitle: text(x.CollectionTitle),
    MainAuthor: text(x.MainAuthor),
    CollectionImage: text(x.CollectionImage),
    Description: text(x.Description || x.TitleDescription),
    ClassCode: text(x.ClassCode),
    MaterialType: text(x.MaterialType),
    Publisher: text(x.Publisher),
    PublicationYear: text(x.PublicationYear),
    CopyrightYear: text(x.CopyrightYear),
    Subjects: list(x.Subjects),
    BorrowCount: Number(x.BorrowCount || 0),
    Status: text(x.Status),
    CreatedOn: toMillis(x.CreatedOn),
    Copies: copies.map(mapOpacCopy),
    OtherCopies: otherCopies.map(mapOpacCopy),
  };
}


let cachedCatalogue: OpacCollection[] | null = null;

let cachedCatalogueAt = 0;

let cachedCatalogueVersion: number | null = null;


const CATALOGUE_TTL = 5 * 60 * 1000;


export async function catalogueVersion(): Promise<number | null> {
  try {
    const snap = await db
      .collection("metadata")
      .doc("search_index")
      .get();
    const version = Number((snap.data() as { version?: number })?.version);
    return Number.isFinite(version) ? version : null;
  } catch (error) {
    console.warn("Could not read the catalogue version counter", error);
    return null;
  }
}


export async function fetchOpacCatalogue(): Promise<OpacCollection[]> {
  const version = await catalogueVersion();

  if (cachedCatalogue) {
    const unchanged =
      version !== null
        ? version === cachedCatalogueVersion
        : Date.now() - cachedCatalogueAt < CATALOGUE_TTL;
    if (unchanged) return cachedCatalogue;
  }

  const snap = await db
    .collection("collections")
    .orderBy("CollectionTitle")
    .select(...OPAC_FIELDS)
    .get();
  const records = snap.docs.map(mapCollectionOpac);

  cachedCatalogue = records;
  cachedCatalogueAt = Date.now();
  cachedCatalogueVersion = version;
  return records;
}
