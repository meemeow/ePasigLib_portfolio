import { pageRowsInMemory } from "../../../core/pagination";
import {
  PatronDataPaginatedRequest,
  PatronDataPaginatedResponse,
  mapPatronForTable,
  getSortField,
  getSortDirection,
  PatronFilters,
  PatronLogEntry,
  PatronLogsResponse,
  PatronCheckoutEntry,
  PatronCheckinEntry,
} from "./fetching-types";
import { toMillis } from "../../../core/time";
import { transactionsRef } from "../../circulation/circulation-policy";
import {
  PATRON_LOG_REGISTERS,
  queryLogEntries,
} from "../writes/lms-log-entries";
import { db } from "../../../core/firebase";

export async function getUnverifiedCount(): Promise<number> {
  try {
    const snapshot = await db
      .collection("patrons")
      .where("State", "==", "Unverified")
      .count()
      .get();
    return snapshot.data().count;
  } catch (error) {
    console.warn("Failed to get unverified count:", error);
    return 0;
  }
}

export async function fetchPatronById(
  patronId: string,
): Promise<Record<string, unknown> | null> {
  if (!patronId) return null;
  const doc = await db.collection("patrons").doc(patronId).get();
  if (!doc.exists) return null;
  const x = doc.data() as Record<string, unknown>;
  return {
    id: doc.id,
    Avatar: x.Avatar || "",
    ID: x.ID || "",
    CreatedBy: x.CreatedBy || "",
    CreatedOn: toMillis(x.CreatedOn),
    Role: x.Role || "",
    reverificationAt: x.reverificationAt || "",
    BirthDate: x.BirthDate || "",
    FirstName: x.FirstName || "",
    MiddleName: x.MiddleName || "",
    LastName: x.LastName || "",
    Suffix: x.Suffix || "",
    Email: x.Email || "",
    PhoneNumber: x.PhoneNumber || "",
    SchoolWork: x.SchoolWork || "",
    City: x.City || "",
    Barangay: x.Barangay || "",
    State: x.State || "",
    Sex: x.Sex || "",
    UID: x.UID || "",
    PublicUID: x.PublicUID || "-",
    Status: x.Status || "",
    LastBorrowedDate: toMillis(x.LastBorrowedDate),
  };
}

function ageBounds(range?: string): { min: string | null; max: string | null } {
  if (!range || range === "All") return { min: null, max: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let minBirthDate: Date | null = null;
  let maxBirthDate: Date | null = null;

  switch (range) {
    case "Under 18": {
      minBirthDate = new Date(today);
      minBirthDate.setFullYear(today.getFullYear() - 17);
      break;
    }
    case "18-25": {
      minBirthDate = new Date(today);
      minBirthDate.setFullYear(today.getFullYear() - 25);
      maxBirthDate = new Date(today);
      maxBirthDate.setFullYear(today.getFullYear() - 18);
      break;
    }
    case "26-40": {
      minBirthDate = new Date(today);
      minBirthDate.setFullYear(today.getFullYear() - 40);
      maxBirthDate = new Date(today);
      maxBirthDate.setFullYear(today.getFullYear() - 26);
      break;
    }
    case "41-60": {
      minBirthDate = new Date(today);
      minBirthDate.setFullYear(today.getFullYear() - 60);
      maxBirthDate = new Date(today);
      maxBirthDate.setFullYear(today.getFullYear() - 41);
      break;
    }
    case "60+": {
      maxBirthDate = new Date(today);
      maxBirthDate.setFullYear(today.getFullYear() - 60);
      break;
    }
  }

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    min: minBirthDate ? formatDate(minBirthDate) : null,
    max: maxBirthDate ? formatDate(maxBirthDate) : null,
  };
}

function withinAgeBounds(
  birth: string,
  bounds: { min: string | null; max: string | null },
): boolean {
  if (bounds.min === null && bounds.max === null) return true;
  if (!birth) return false;
  if (bounds.min !== null && birth < bounds.min) return false;
  if (bounds.max !== null && birth > bounds.max) return false;
  return true;
}

async function fetchPatronsByIds(
  ids: string[],
  searchTerm?: string,
  filters?: PatronFilters,
): Promise<PatronDataPaginatedResponse> {
  const refs = ids.map((id) => db.collection("patrons").doc(id));
  const snaps = await db.getAll(...refs);

  let documents = snaps
    .filter((doc) => {
      if (!doc.exists) return false;
      if (filters?.status && filters.status !== "All") {
        if (String(doc.get("Status") ?? "") !== filters.status) return false;
      }
      if (
        filters?.state?.length &&
        !filters.state.includes(String(doc.get("State") ?? ""))
      ) {
        return false;
      }
      const city = String(doc.get("City") ?? "");
      if (filters?.residency === "Pasig Resident") {
        if (city !== "City of Pasig") return false;
        if (
          filters.barangay?.trim() &&
          String(doc.get("Barangay") ?? "") !== filters.barangay
        ) {
          return false;
        }
      } else if (filters?.residency === "Non-Pasig Resident") {
        if (city === "City of Pasig") return false;
      }
      return withinAgeBounds(
        String(doc.get("BirthDate") ?? ""),
        ageBounds(filters?.ageRange),
      );
    })
    .map(mapPatronForTable);

  const term = searchTerm?.trim().toLowerCase();
  if (term) {
    documents = documents.filter((doc) =>
      [
        doc.PublicUID,
        doc.UID,
        doc.Email,
        doc.FirstName,
        doc.MiddleName,
        doc.LastName,
        doc.Suffix,
      ].some((field) => field && String(field).toLowerCase().includes(term)),
    );
  }

  const rank = new Map(ids.map((id, index) => [id, index]));
  documents.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

  return {
    data: documents,
    page: 1,
    totalPages: 1,
    hasMore: false,
    total: documents.length,
  };
}

export async function fetchPatronDataPaginated(
  params: PatronDataPaginatedRequest,
): Promise<PatronDataPaginatedResponse> {
  const { limit, page = 1, searchTerm, filters, sortBy, ids } = params;

  if (ids && ids.length > 0) {
    return await fetchPatronsByIds(ids, searchTerm, filters);
  }

  let query: FirebaseFirestore.Query = db.collection("patrons");

  if (filters) {
    if (filters.status && filters.status !== "All") {
      query = query.where("Status", "==", filters.status);
    }

    if (filters.state && filters.state.length > 0) {
      if (filters.state.length === 1) {
        query = query.where("State", "==", filters.state[0]);
      } else {
        query = query.where("State", "in", filters.state);
      }
    }

    if (filters.residency === "Pasig Resident") {
      query = query.where("City", "==", "City of Pasig");
      if (filters.barangay && filters.barangay.trim()) {
        query = query.where("Barangay", "==", filters.barangay);
      }
    }
  }

  query = query.select(
    "PublicUID",
    "UID",
    "FirstName",
    "MiddleName",
    "LastName",
    "Suffix",
    "Email",
    "State",
    "Barangay",
    "SchoolWork",
    "Status",
    "LastBorrowedDate",
    "CreatedOn",
    "City",
    "BirthDate",
  );

  const snapshot = await query.get();

  const bounds = ageBounds(filters?.ageRange);
  const residency = filters?.residency;

  const matching = snapshot.docs.filter((doc) => {
    if (residency === "Non-Pasig Resident") {
      if (String(doc.get("City") ?? "") === "City of Pasig") return false;
    }
    return withinAgeBounds(String(doc.get("BirthDate") ?? ""), bounds);
  });

  const documents = matching.map(mapPatronForTable);

  let filteredDocuments = documents;
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    filteredDocuments = documents.filter((doc) => {
      const searchableFields = [
        doc.PublicUID,
        doc.UID,
        doc.Email,
        doc.FirstName,
        doc.MiddleName,
        doc.LastName,
        doc.Suffix,
      ];
      return searchableFields.some(
        (field) => field && String(field).toLowerCase().includes(term),
      );
    });
  }

  const sortField = sortBy?.column ? getSortField(sortBy.column) : "LastName";
  const sortDirection = sortBy?.direction
    ? getSortDirection(sortBy.direction)
    : "asc";

  return pageRowsInMemory(
    filteredDocuments,
    sortField,
    sortDirection,
    limit,
    page,
  );
}

const PATRON_LOG_ACTIONS = new Set([
  "PatronAdd",
  "PatronVerify",
  "PatronEdit",
  "PatronArchive",
  "PatronUnarchive",
  "PatronEmailUpdate",
]);

export async function fetchPatronLogs(
  patronUID: string,
): Promise<PatronLogsResponse> {
  const [rows, transactions] = await Promise.all([
    queryLogEntries(db, PATRON_LOG_REGISTERS, "TargetUID", [patronUID]),
    transactionsRef(db)
      .where("TargetUID", "==", patronUID)
      .orderBy("ProcessedOn", "desc")
      .get(),
  ]);

  const modificationLogs: PatronLogEntry[] = [];
  const checkoutHistory: PatronCheckoutEntry[] = [];
  const checkinHistory: PatronCheckinEntry[] = [];

  for (const doc of transactions.docs) {
    const v = doc.data() as Record<string, unknown>;
    if (v.Type === "Checkout") {
      checkoutHistory.push({
        id: doc.id,
        Accession: String(v.Accession ?? ""),
        CollectionTitle: String(v.CollectionTitle ?? ""),
        ProcessedBy: String(v.ProcessedBy ?? ""),
        ProcessedOn: toMillis(v.ProcessedOn),
        DueDate: toMillis(v.DueDate),
        TargetUID: patronUID,
        Status: String(v.Status ?? "Borrowed"),
      });
    } else if (v.Type === "Checkin") {
      const violations = v.Violations;
      checkinHistory.push({
        id: doc.id,
        Accession: String(v.Accession ?? ""),
        CollectionTitle: String(v.CollectionTitle ?? ""),
        ProcessedBy: String(v.ProcessedBy ?? ""),
        ProcessedOn: toMillis(v.ProcessedOn),
        TargetUID: patronUID,
        Violations: Array.isArray(violations)
          ? violations.map(String)
          : String(violations ?? "None"),
      });
    }
  }

  for (const { register, id: entryKey, data: v } of rows) {
    {
      const action = String(v.Action || "");
      if (!PATRON_LOG_ACTIONS.has(action)) continue;

      modificationLogs.push({
        Action: action,
        TargetName: String(v.TargetName || ""),
        Description: String(v.Description || ""),
        On:
          toMillis(v.ModifiedOn) ??
          toMillis(v.CreatedOn) ??
          toMillis(v.ArchivedOn) ??
          toMillis(v.UnarchivedOn) ??
          toMillis(v.ProcessedOn) ??
          toMillis(v.ConfiguredOn),
        By: String(
          v.ModifiedBy ||
            v.CreatedBy ||
            v.ArchivedBy ||
            v.UnarchivedBy ||
            v.ProcessedBy ||
            v.By ||
            v.StaffName ||
            "",
        ),
        id: `${register}_${entryKey}`,
      });
    }
  }

  modificationLogs.sort((a, b) => (b.On ?? 0) - (a.On ?? 0));
  checkoutHistory.sort((a, b) => (b.ProcessedOn ?? 0) - (a.ProcessedOn ?? 0));
  checkinHistory.sort((a, b) => (b.ProcessedOn ?? 0) - (a.ProcessedOn ?? 0));

  return { modificationLogs, checkoutHistory, checkinHistory };
}

export async function fetchUnverifiedPatrons(): Promise<
  Record<string, unknown>[]
> {
  const snap = await db
    .collection("patrons")
    .where("State", "==", "Unverified")
    .get();
  const list = snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      Avatar: x.Avatar || "",
      ID: x.ID || "",
      CreatedBy: x.CreatedBy || "",
      CreatedOn: toMillis(x.CreatedOn),
      Role: x.Role || "",
      reverificationAt: x.reverificationAt || "",
      BirthDate: x.BirthDate || "",
      FirstName: x.FirstName || "",
      MiddleName: x.MiddleName || "",
      LastName: x.LastName || "",
      Suffix: x.Suffix || "",
      Email: x.Email || "",
      PhoneNumber: x.PhoneNumber || "",
      SchoolWork: x.SchoolWork || "",
      City: x.City || "",
      Barangay: x.Barangay || "",
      State: x.State || "",
      Sex: x.Sex || "",
      UID: x.UID || "",
      PublicUID: x.PublicUID || "-",
      Status: x.Status || "",
      LastBorrowedDate: toMillis(x.LastBorrowedDate),
    };
  });
  return list;
}
