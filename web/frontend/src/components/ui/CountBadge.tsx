export function CountBadge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (!count || count < 1) return null;
  return (
    <span
      aria-hidden
      className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-[gothamBlack] text-white ring-2 ring-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default CountBadge;
