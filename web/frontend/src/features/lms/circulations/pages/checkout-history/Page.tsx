import { useMemo } from "react";
import { useCirculationRecords } from "@/features/lms/circulations/api/circulation-records-logic";
import {
  formatMillis,
  formatMillisTime,
} from "@/features/lms/circulations/api/circulation-records-helpers";
import RecordsScreen from "@/features/lms/circulations/components/RecordsScreen";
import PersonCell from "@/features/lms/circulations/components/PersonCell";
import CirculationStatusBadge from "@/features/lms/circulations/components/CirculationStatusBadge";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import type { CirculationHistoryRow } from "@/features/lms/circulations/types/circulation-records-types";

export default function CheckOutHistory() {
  const list = useCirculationRecords("checkoutHistory");

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
        key: "processedOn",
        header: "Checked Out",
        headClassName: "w-[170px]",
        cell: (row) => formatMillisTime(row.ProcessedOn),
      },
      {
        key: "dueDate",
        header: "Due",
        headClassName: "w-[140px]",
        cell: (row) => formatMillis(row.DueDate),
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
        headClassName: "w-[120px] text-center",
        cellClassName: "text-center align-middle",
        cell: (row) => (
          <CirculationStatusBadge status={row.Status} dueDate={row.DueDate} />
        ),
      },
    ],
    [],
  );

  return <RecordsScreen list={list} columns={columns} />;
}
