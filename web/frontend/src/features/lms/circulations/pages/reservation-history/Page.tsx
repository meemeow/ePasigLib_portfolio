import { useMemo } from "react";
import { useCirculationRecords } from "@/features/lms/circulations/api/circulation-records-logic";
import { formatMillisTime } from "@/features/lms/circulations/api/circulation-records-helpers";
import RecordsScreen from "@/features/lms/circulations/components/RecordsScreen";
import PersonCell from "@/features/lms/circulations/components/PersonCell";
import CirculationStatusBadge from "@/features/lms/circulations/components/CirculationStatusBadge";
import BooksList from "@/features/lms/circulations/components/BooksList";
import type { RecordColumn } from "@/components/ui/RecordsTable";
import type { CirculationHistoryRow } from "@/features/lms/circulations/types/circulation-records-types";

export default function ReservationHistory() {
  const list = useCirculationRecords("reservationHistory");

  const columns = useMemo<RecordColumn<CirculationHistoryRow>[]>(
    () => [
      {
        key: "patron",
        header: "Patron",
        headClassName: "w-[190px]",
        cell: (row) => (
          <PersonCell
            name={row.TargetName}
            uid={row.TargetPublicUID || row.TargetUID}
          />
        ),
      },
      {
        key: "books",
        header: "Books",
        headClassName: "min-w-[280px]",
        cell: (row) => <BooksList books={row.Books} />,
      },
      {
        key: "purpose",
        header: "Purpose",
        headClassName: "min-w-[200px]",
        cell: (row) => (
          <p
            className="line-clamp-3 whitespace-normal text-gray-700"
            title={row.Purpose || undefined}
          >
            {row.Purpose || "—"}
          </p>
        ),
      },
      {
        key: "processedOn",
        header: "Processed On",
        headClassName: "w-[170px]",
        cell: (row) => formatMillisTime(row.ProcessedOn),
      },
      {
        key: "processedBy",
        header: "Processed By",
        headClassName: "w-[160px]",
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
        cell: (row) => <CirculationStatusBadge status={row.Status} />,
      },
      {
        key: "remarks",
        header: "Remarks",
        headClassName: "min-w-[220px]",
        cell: (row) => (
          <p
            className="line-clamp-3 whitespace-normal text-gray-700"
            title={row.Remarks || undefined}
          >
            {row.Remarks || "—"}
          </p>
        ),
      },
    ],
    [],
  );

  return <RecordsScreen list={list} columns={columns} />;
}
