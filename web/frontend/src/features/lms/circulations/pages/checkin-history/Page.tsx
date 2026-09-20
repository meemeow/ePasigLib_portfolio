import { useMemo } from "react";
import { useCirculationRecords } from "@/features/lms/circulations/api/circulation-records-logic";
import { formatMillisTime } from "@/features/lms/circulations/api/circulation-records-helpers";
import RecordsScreen from "@/features/lms/circulations/components/RecordsScreen";
import PersonCell from "@/features/lms/circulations/components/PersonCell";
import CirculationStatusBadge from "@/features/lms/circulations/components/CirculationStatusBadge";
import { Badge } from "@/components/ui/Badge";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import type { CirculationHistoryRow } from "@/features/lms/circulations/types/circulation-records-types";

function isClean(violations: string): boolean {
  const v = String(violations || "")
    .trim()
    .toLowerCase();
  return v === "" || v === "none";
}

export default function CheckInHistory() {
  const list = useCirculationRecords("checkinHistory");

  const columns = useMemo<RecordColumn<CirculationHistoryRow>[]>(
    () => [
      {
        key: "borrower",
        header: "Borrower",
        headClassName: "w-[190px]",
        cell: (row) => (
          <PersonCell
            name={row.TargetName}
            uid={row.TargetPublicUID || row.TargetUID}
          />
        ),
      },
      {
        key: "collection",
        header: "Collection",
        headClassName: "min-w-[240px]",
        cell: (row) => (
          <div className="min-w-0">
            <div className="whitespace-normal break-words">
              {row.CollectionTitle || "—"}
            </div>
            <div className="font-mono text-xs text-gray-500">
              {row.Accession}
            </div>
          </div>
        ),
      },
      {
        key: "checkinDate",
        header: "Checked In",
        headClassName: "w-[170px]",
        cell: (row) => formatMillisTime(row.CheckinDate ?? row.ProcessedOn),
      },
      {
        key: "violations",
        header: "Violations",
        headClassName: "w-[150px] text-center",
        cellClassName: "text-center align-middle",
        cell: (row) =>
          isClean(row.Violations) ? (
            <Badge
              variant="outline"
              className="border-transparent bg-green-100 font-[gothamMedium] text-green-700"
            >
              None
            </Badge>
          ) : (
            <span className="whitespace-normal break-words text-red-700">
              {row.Violations}
            </span>
          ),
      },
      {
        key: "processedBy",
        header: "Processed By",
        headClassName: "w-[170px]",
        cell: (row) => (
          <PersonCell
            name={row.ProcessedBy}
            uid={row.ProcessedByCode || row.ProcessedByUID}
          />
        ),
      },
      {
        key: "status",
        header: "Status",
        headClassName: "w-[110px] text-center",
        cellClassName: "text-center align-middle",
        cell: (row) => (
          <CirculationStatusBadge status={row.Status || "Returned"} />
        ),
      },
    ],
    [],
  );

  return <RecordsScreen list={list} columns={columns} />;
}
