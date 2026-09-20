interface PersonCellProps {
  name?: string | null;
  uid?: string | null;
  fallback?: string;
}

export default function PersonCell({
  name,
  uid,
  fallback = "—",
}: PersonCellProps) {
  return (
    <div className="min-w-0">
      <div className="truncate font-[gothamMedium] text-[#003067]">
        {name || fallback}
      </div>
      {uid ? <div className="truncate text-xs text-gray-500">{uid}</div> : null}
    </div>
  );
}
