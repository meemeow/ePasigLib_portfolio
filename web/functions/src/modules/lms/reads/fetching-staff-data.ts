import { deriveGrantedRolesFromTable } from "../../users/staff-permissions";
import { pageRowsInMemory } from "../../../core/pagination";
import {
  StaffDataPaginatedRequest,
  StaffDataPaginatedResponse,
  mapStaffForTable,
  getStaffSortField,
  getStaffSortDirection,
  StaffFilters,
  StaffLogEntry,
  StaffLogsResponse,
} from "./fetching-types";
import { toMillis } from "../../../core/time";
import { transactionsRef } from "../../circulation/circulation-policy";
import {
  ALL_LOG_REGISTERS,
  STAFF_LOG_REGISTERS,
  queryLogEntries,
} from "../writes/lms-log-entries";
import { db } from "../../../core/firebase";

type FirestoreData = Record<string, unknown>;

const OWN_TRANSACTION_LIMIT = 200;

const ACTOR_UID_FIELDS = [
  "UID",
  "ByUID",
  "StaffUID",
  "ProcessedByUID",
  "CreatedByUID",
  "ModifiedByUID",
  "EditedByUID",
  "ArchivedByUID",
  "UnarchivedByUID",
] as const;

const COLLECTION_LOG_ACTIONS: Record<string, string> = {
  collection_add: "CollectionAdd",
  collection_edit: "CollectionEdit",
  collection_archive: "CollectionArchive",
};

function isWrittenBy(entry: FirestoreData, actorUIDs: Set<string>): boolean {
  return ACTOR_UID_FIELDS.some((field) => {
    const value = entry[field];
    return typeof value === "string" && actorUIDs.has(value);
  });
}

export async function fetchStaffById(
  staffId: string,
): Promise<Record<string, unknown> | null> {
  if (!staffId) return null;
  const doc = await db.collection("staffs").doc(staffId).get();
  if (!doc.exists) return null;
  const x = doc.data() as Record<string, unknown>;
  return {
    id: doc.id,
    Avatar: x.Avatar || "",
    Barangay: x.Barangay || "",
    BirthDate: x.BirthDate || "",
    City: x.City || "",
    PhoneNumber: x.PhoneNumber || "",
    UID: x.UID || "",
    Sex: x.Sex || "",
    FirstName: x.FirstName || "",
    MiddleName: x.MiddleName || "",
    LastName: x.LastName || "",
    Suffix: x.Suffix || "",
    Email: x.Email || "",
    StaffCode: x.StaffCode || "",
    Position: x.Position || "",
    JobTitle: x.JobTitle || "",
    CreatedOn: toMillis(x.CreatedOn),
    CreatedBy: x.CreatedBy || "",
    Role: x.Role || "",
    Status: x.Status || "",
    CatalogingAdd: !!x.CatalogingAdd,
    CatalogingEdit: !!x.CatalogingEdit,
    CatalogingArchive: !!x.CatalogingArchive,
    StaffEdit: !!x.StaffEdit,
    StaffAdd: !!x.StaffAdd,
    StaffArchive: !!x.StaffArchive,
    PatronAdd: !!x.PatronAdd,
    PatronEdit: !!x.PatronEdit,
    PatronArchive: !!x.PatronArchive,
    VerifyIDs: !!x.VerifyIDs,
    Checkin: !!x.Checkin,
    Checkout: !!x.Checkout,
    ApproveRenewals: !!x.ApproveRenewals,
    AnnouncementCreation: !!x.AnnouncementCreation,
    ReportGeneration: !!x.ReportGeneration,
    LiveChat: !!x.LiveChat,
  };
}

async function fetchStaffsByIds(
  ids: string[],
  searchTerm?: string,
  filters?: StaffFilters,
): Promise<StaffDataPaginatedResponse> {
  const refs = ids.map((id) => db.collection("staffs").doc(id));
  const snaps = await db.getAll(...refs);

  let documents = snaps
    .filter((doc) => doc.exists)
    .map(mapStaffForTable)
    .filter((doc) => {
      if (filters?.status && filters.status !== "All") {
        if (doc.Status !== filters.status) return false;
      }
      if (filters?.positions?.length) {
        if (!filters.positions.includes(doc.JobTitle)) return false;
      }
      if (filters?.roles?.length) {
        const granted = deriveGrantedRolesFromTable(doc);
        if (!filters.roles.every((role) => granted.includes(role))) return false;
      }
      return true;
    });

  const term = searchTerm?.trim().toLowerCase();
  if (term) {
    documents = documents.filter((doc) =>
      [
        doc.StaffCode,
        doc.Email,
        doc.FirstName,
        doc.MiddleName,
        doc.LastName,
        doc.Suffix,
        doc.JobTitle,
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

export async function fetchStaffDataPaginated(
  params: StaffDataPaginatedRequest,
): Promise<StaffDataPaginatedResponse> {
  const { limit, page = 1, searchTerm, filters, sortBy, ids } = params;

  if (ids && ids.length > 0) {
    return await fetchStaffsByIds(ids, searchTerm, filters);
  }

  let query: FirebaseFirestore.Query = db.collection("staffs");

  if (filters) {
    if (filters.status && filters.status !== "All") {
      query = query.where("Status", "==", filters.status);
    }

    if (filters.positions && filters.positions.length > 0) {
      if (filters.positions.length === 1) {
        query = query.where("JobTitle", "==", filters.positions[0]);
      } else {
        query = query.where("JobTitle", "in", filters.positions);
      }
    }
  }

  query = query.select(
    "StaffCode",
    "FirstName",
    "MiddleName",
    "LastName",
    "Suffix",
    "Email",
    "JobTitle",
    "Position",
    "Status",
    "CatalogingAdd",
    "CatalogingEdit",
    "CatalogingArchive",
    "StaffEdit",
    "StaffAdd",
    "StaffArchive",
    "PatronAdd",
    "PatronEdit",
    "PatronArchive",
    "VerifyIDs",
    "Checkin",
    "Checkout",
    "ApproveRenewals",
    "AnnouncementCreation",
    "ReportGeneration",
    "LiveChat",
  );

  const snapshot = await query.get();
  const documents = snapshot.docs.map(mapStaffForTable);

  let filteredDocuments = documents;
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    filteredDocuments = documents.filter((doc) => {
      const searchableFields = [
        doc.StaffCode,
        doc.Email,
        doc.FirstName,
        doc.MiddleName,
        doc.LastName,
        doc.Suffix,
        doc.JobTitle,
      ];
      return searchableFields.some(
        (field) => field && String(field).toLowerCase().includes(term),
      );
    });
  }

  if (filters?.roles && filters.roles.length > 0) {
    filteredDocuments = filteredDocuments.filter((doc) => {
      const grantedRoles = deriveGrantedRolesFromTable(doc);
      return filters.roles.every((role) => grantedRoles.includes(role));
    });
  }

  const sortField = sortBy?.column
    ? getStaffSortField(sortBy.column)
    : "LastName";
  const sortDirection = sortBy?.direction
    ? getStaffSortDirection(sortBy.direction)
    : "asc";

  return pageRowsInMemory(
    filteredDocuments,
    sortField,
    sortDirection,
    limit,
    page,
  );
}

const STAFF_LOG_ACTIONS = new Set([
  "StaffAdd",
  "StaffEdit",
  "StaffArchive",
  "StaffUnarchive",
  "StaffEmailUpdate",
]);

export async function fetchStaffLogs(
  staffUID: string,
): Promise<StaffLogsResponse> {
  const rows = await queryLogEntries(
    db,
    STAFF_LOG_REGISTERS,
    "TargetUID",
    [staffUID],
  );

  const modificationLogs: StaffLogEntry[] = [];

  for (const { register, id: entryKey, data: v } of rows) {
    {
      const action = String(v.Action || "");
      if (!STAFF_LOG_ACTIONS.has(action)) continue;

      modificationLogs.push({
        id: `${register}_${entryKey}`,
        Action: action,
        TargetName: String(v.TargetName || v.StaffName || ""),
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
        CreatedBy: v.CreatedBy ? String(v.CreatedBy) : undefined,
        CreatedOn: toMillis(v.CreatedOn),
        ModifiedBy: v.ModifiedBy ? String(v.ModifiedBy) : undefined,
        ModifiedOn: toMillis(v.ModifiedOn),
        ArchivedBy: v.ArchivedBy ? String(v.ArchivedBy) : undefined,
        ArchivedOn: toMillis(v.ArchivedOn),
        UnarchivedBy: v.UnarchivedBy ? String(v.UnarchivedBy) : undefined,
        UnarchivedOn: toMillis(v.UnarchivedOn),
        ProcessedBy: v.ProcessedBy ? String(v.ProcessedBy) : undefined,
        ProcessedOn: toMillis(v.ProcessedOn),
        UID: v.UID ? String(v.UID) : undefined,
        TargetUID: staffUID,
      });
    }
  }

  modificationLogs.sort((a, b) => (b.On ?? 0) - (a.On ?? 0));

  return { modificationLogs };
}

export async function fetchOwnStaffModificationLogs(
  authUid: string,
): Promise<StaffLogEntry[]> {

  const staffSnap = await db.collection("staffs").doc(authUid).get();
  if (!staffSnap.exists) return [];

  const actorUIDs = new Set([authUid]);
  const publicUID = String((staffSnap.data() as FirestoreData).UID || "");
  if (publicUID) actorUIDs.add(publicUID);

  const [rows, transactions] = await Promise.all([
    queryLogEntries(
      db,
      ALL_LOG_REGISTERS,
      "UID",
      [...actorUIDs],
      OWN_TRANSACTION_LIMIT,
    ),
    transactionsRef(db)
      .where("UID", "in", [...actorUIDs])
      .orderBy("ProcessedOn", "desc")
      .limit(OWN_TRANSACTION_LIMIT)
      .get(),
  ]);

  const candidates: { docId: string; entry: FirestoreData }[] = [];

  for (const { register, data } of rows) {
    const entry = data as FirestoreData;
    if (!isWrittenBy(entry, actorUIDs)) continue;
    candidates.push({ docId: register, entry });
  }

  for (const doc of transactions.docs) {
    candidates.push({ docId: "transactions", entry: doc.data() as FirestoreData });
  }

  const logs: StaffLogEntry[] = [];

  for (const { docId, entry } of candidates) {
    const CreatedOn = toMillis(entry.CreatedOn);
    const ModifiedOn = toMillis(entry.ModifiedOn) ?? toMillis(entry.EditedOn);
    const ArchivedOn = toMillis(entry.ArchivedOn);
    const UnarchivedOn = toMillis(entry.UnarchivedOn);
    const ProcessedOn =
      toMillis(entry.ProcessedOn) ??
      toMillis(entry.ConfiguredOn) ??
      toMillis(entry.Date);

    const CreatedBy = String(entry.CreatedBy || "");
    const ModifiedBy = String(entry.ModifiedBy || entry.EditedBy || "");
    const ArchivedBy = String(entry.ArchivedBy || "");
    const UnarchivedBy = String(entry.UnarchivedBy || "");
    const ProcessedBy = String(
      entry.ProcessedBy || entry.By || entry.StaffName || "",
    );

    logs.push({
      Action:
        String(entry.Action || "") ||
        COLLECTION_LOG_ACTIONS[docId] ||
        String(entry.Type || ""),
      TargetName: String(
        entry.TargetName ||
          entry.TargetCollection ||
          entry.CollectionTitle ||
          entry.PatronName ||
          entry.StaffName ||
          entry.Name ||
          "",
      ),
      Description: String(entry.Description || ""),
      On: ModifiedOn ?? CreatedOn ?? ArchivedOn ?? UnarchivedOn ?? ProcessedOn,
      By: ModifiedBy || CreatedBy || ArchivedBy || UnarchivedBy || ProcessedBy,
      CreatedBy,
      CreatedOn,
      ModifiedBy,
      ModifiedOn,
      ArchivedBy,
      ArchivedOn,
      UnarchivedBy,
      UnarchivedOn,
      ProcessedBy,
      ProcessedOn,
      UID: entry.UID ? String(entry.UID) : undefined,
      TargetUID: entry.TargetUID ? String(entry.TargetUID) : undefined,
    });
  }

  logs.sort((a, b) => (b.On ?? 0) - (a.On ?? 0));
  return logs;
}
