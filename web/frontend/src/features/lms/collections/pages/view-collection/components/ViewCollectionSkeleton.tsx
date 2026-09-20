import { Skeleton } from "@/components/ui/Skeleton";

function EntrySkeleton({ valueWidth }: { valueWidth: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className={`h-4 ${valueWidth} max-w-full`} />
      </div>
    </div>
  );
}

export default function ViewCollectionSkeleton() {
  return (
    <div className="min-w-0 flex-1">
      <div className="hidden w-full flex-col py-3 md:w-auto xl:flex">
        <div className="flex-1" />
        <div className="flex items-end justify-end gap-2 align-bottom">
          <Skeleton className="h-10 w-[104px]" />
          <Skeleton className="h-10 w-[84px]" />
          <Skeleton className="h-10 w-[104px]" />
        </div>
      </div>

      <div className="relative mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row">
          <Skeleton className="h-44 w-32 shrink-0 rounded-lg max-md:self-center" />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-md:flex-col max-md:items-center">
              <Skeleton className="h-7 w-64 max-w-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            <div className="flex flex-wrap gap-1.5 max-md:justify-center">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            <EntrySkeleton valueWidth="w-52" />
            <EntrySkeleton valueWidth="w-44" />
            <EntrySkeleton valueWidth="w-64" />
            <EntrySkeleton valueWidth="w-36" />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full md:h-10 md:w-10" />
          <div className="space-y-2 py-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
