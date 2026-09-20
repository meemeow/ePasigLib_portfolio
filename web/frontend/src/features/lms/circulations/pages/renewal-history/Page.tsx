import { useMemo } from "react";
import { useCirculationRecords } from "@/features/lms/circulations/api/circulation-records-logic";
import {
  formatMillis,
  formatMillisTime,
} from "@/features/lms/circulations/api/circulation-records-helpers";
import RecordsScreen from "@/features/lms/circulations/components/RecordsScreen";
import PersonCell from "@/features/lms/circulations/components/PersonCell";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import type { CirculationHistoryRow } from "@/features/lms/circulations/types/circulation-records-types";

export default function RenewalHistory() {
  const list = useCirculationRecords("renewalHistory");

  const columns = useMemo<RecordColumn<CirculationHistoryRow>[]>(
    () => [
      {
        key: "patron",
        header: "Patron",
        headClassName: "w-[180px]",
        cell: (row) => (
          <PersonCell
            name={row.TargetName}
            uid={row.TargetPublicUID || row.TargetUID}
          />
        ),
      },
      {
        key: "book",
        header: "Book",
        headClassName: "min-w-[240px]",
        cell: (row) => (
          <div className="min-w-0">
            <div className="truncate font-[gothamMedium] text-[#003067]">
              {row.CollectionTitle || "—"}
            </div>
            <div className="truncate text-xs text-gray-500">
              {row.Accession || "—"}
            </div>
          </div>
        ),
      },
      {
        key: "processedOn",
        header: "Renewed On",
        headClassName: "w-[170px]",
        cell: (row) => formatMillisTime(row.ProcessedOn),
      },
      {
        key: "dueDate",
        header: "Was Due",
        headClassName: "w-[130px]",
        cell: (row) => formatMillis(row.DueDate),
      },
      {
        key: "newDueDate",
        header: "Now Due",
        headClassName: "w-[130px]",
        cell: (row) => (
          <span className="font-[gothamMedium] text-[#003067]">
            {formatMillis(row.NewDueDate)}
          </span>
        ),
      },
      {
        key: "daysOfExtension",
        header: "Days",
        headClassName: "w-[90px] text-center",
        cellClassName: "text-center align-middle",
        cell: (row) =>
          row.DaysOfExtension === null ? "—" : String(row.DaysOfExtension),
      },
      {
        key: "processedBy",
        header: "Renewed By",
        headClassName: "w-[150px]",
        cell: (row) => (
          <PersonCell
            name={row.ProcessedBy}
            uid={row.ProcessedByCode || row.ProcessedByUID}
            fallback="Self-service"
          />
        ),
      },
    ],
    [],
  );

  return <RecordsScreen list={list} columns={columns} />;
}
