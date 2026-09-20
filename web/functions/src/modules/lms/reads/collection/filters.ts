import { Timestamp, db } from "../../../../core/firebase";
import { CollectionFilters } from "../fetching-types";
import { text } from "./mappers";


function withinLocationMode(
  filters: CollectionFilters,
  copies: unknown,
  otherCopies: unknown,
): boolean {
  if (filters.libraryLocationMode === "PKC") {
    return Array.isArray(copies) && copies.length > 0;
  }
  if (filters.libraryLocationMode === "Other") {
    return Array.isArray(otherCopies) && otherCopies.length > 0;
  }
  return true;
}


function hasYearFilters(filters: CollectionFilters): boolean {
  return Boolean(
    filters.pubYearStart ||
      filters.pubYearEnd ||
      filters.copyrightStart ||
      filters.copyrightEnd,
  );
}


function yearOf(value: unknown): number | null {
  const match = /\d{4}/.exec(text(value));
  return match ? Number(match[0]) : null;
}


function boundYear(value?: string): number | null {
  const year = yearOf(value);
  return year === null ? null : year;
}


export function createdRange(filters?: CollectionFilters): {
  start: Date | null;
  end: Date | null;
} {
  if (!filters) return { start: null, end: null };

  const startMonth = Number(filters.createdStartMonth);
  const startYear = Number(filters.createdStartYear);
  const endMonth = Number(filters.createdEndMonth);
  const endYear = Number(filters.createdEndYear);

  const start =
    startMonth >= 1 && startMonth <= 12 && startYear > 0
      ? new Date(startYear, startMonth - 1, 1)
      : null;
  const end =
    endMonth >= 1 && endMonth <= 12 && endYear > 0
      ? new Date(endYear, endMonth, 1)
      : null;

  return { start, end };
}


function withinYearFilters(
  filters: CollectionFilters,
  publicationYear: unknown,
  copyrightYear: unknown,
): boolean {
  const pubStart = boundYear(filters.pubYearStart);
  const pubEnd = boundYear(filters.pubYearEnd);
  if (pubStart !== null || pubEnd !== null) {
    const year = yearOf(publicationYear);
    if (year === null) return false;
    if (pubStart !== null && year < pubStart) return false;
    if (pubEnd !== null && year > pubEnd) return false;
  }

  const copyStart = boundYear(filters.copyrightStart);
  const copyEnd = boundYear(filters.copyrightEnd);
  if (copyStart !== null || copyEnd !== null) {
    const year = yearOf(copyrightYear);
    if (year === null) return false;
    if (copyStart !== null && year < copyStart) return false;
    if (copyEnd !== null && year > copyEnd) return false;
  }

  return true;
}


const MAX_DISJUNCTIONS = 30;


function materialTypesAreIndexable(filters?: CollectionFilters): boolean {
  const materialCount = filters?.materialTypes?.length || 0;
  if (materialCount === 0) return false;
  const classCount = filters?.classCodes?.length || 1;
  return classCount * materialCount <= MAX_DISJUNCTIONS;
}


export function buildQuery(filters?: CollectionFilters): FirebaseFirestore.Query {
  let query: FirebaseFirestore.Query = db
    .collection("collections");

  if (!filters) return query;

  if (filters.status && filters.status !== "All") {
    query = query.where("Status", "==", filters.status);
  }
  if (filters.classCodes?.length) {
    query =
      filters.classCodes.length === 1
        ? query.where("ClassCode", "==", filters.classCodes[0])
        : query.where(
          "ClassCode",
          "in",
          filters.classCodes.slice(0, MAX_DISJUNCTIONS),
        );
  }
  if (materialTypesAreIndexable(filters) && filters.materialTypes) {
    query =
      filters.materialTypes.length === 1
        ? query.where("MaterialType", "==", filters.materialTypes[0])
        : query.where("MaterialType", "in", filters.materialTypes);
  }

  const { start, end } = createdRange(filters);
  if (start) {
    query = query.where(
      "CreatedOn",
      ">=",
      Timestamp.fromDate(start),
    );
  }
  if (end) {
    query = query.where(
      "CreatedOn",
      "<",
      Timestamp.fromDate(end),
    );
  }

  return query;
}


export function passesResidualFilters(
  doc: FirebaseFirestore.DocumentSnapshot,
  filters?: CollectionFilters,
): boolean {
  if (!filters) return true;
  if (filters.materialTypes?.length && !materialTypesAreIndexable(filters)) {
    if (!filters.materialTypes.includes(text(doc.get("MaterialType")))) {
      return false;
    }
  }
  return (
    withinYearFilters(
      filters,
      doc.get("PublicationYear"),
      doc.get("CopyrightYear"),
    ) && withinLocationMode(filters, doc.get("Copies"), doc.get("OtherCopies"))
  );
}


export function hasResidualFilters(filters?: CollectionFilters): boolean {
  if (!filters) return false;
  return Boolean(
    hasYearFilters(filters) ||
      (filters.libraryLocationMode && filters.libraryLocationMode !== "All") ||
      (filters.materialTypes?.length && !materialTypesAreIndexable(filters)),
  );
}
