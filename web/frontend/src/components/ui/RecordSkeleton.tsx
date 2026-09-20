import { Skeleton } from "@/components/ui/Skeleton";

interface RecordSkeletonProps {
  fields?: number;
}

function FieldSkeleton({ labelWidth }: { labelWidth: string }) {
  return (
    <div className="space-y-1">
      <Skeleton className={`h-3.5 ${labelWidth}`} />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

function PanelHeadingSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full md:h-10 md:w-10" />
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
    </div>
  );
}

export default function RecordSkeleton({ fields = 10 }: RecordSkeletonProps) {
  const labelWidths = ["w-24", "w-28", "w-20", "w-32"];

  return (
    <div
      className="flex h-full min-h-[70vh] w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md"
      aria-hidden
    >
      <div className="bg-[#003067] px-6 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full bg-white/20" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-36 bg-white/20" />
            <Skeleton className="h-3 w-52 max-w-full bg-white/10" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-7 pb-4 pt-6 sm:p-8 sm:pb-6 sm:pt-6 md:p-10 md:pt-8">
        <div className="grid grid-cols-1 gap-6 md:gap-12 2xl:grid-cols-2 2xl:gap-8">
          <div className="space-y-6 border-b border-gray-200 pb-6 md:pb-12 2xl:border-b-0 2xl:border-r 2xl:border-gray-200 2xl:pb-0 2xl:pr-8">
            <div className="mb-6 md:mb-8">
              <PanelHeadingSkeleton />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
              {Array.from({ length: fields }, (_, i) => (
                <FieldSkeleton
                  key={i}
                  labelWidth={labelWidths[i % labelWidths.length]}
                />
              ))}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <Skeleton className="h-8 w-[110px] shrink-0" />
              </div>
            </div>
          </div>

          <div className="my-auto space-y-6">
            <PanelHeadingSkeleton />
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border bg-gray-50 p-4">
              <Skeleton className="h-48 w-full max-w-[220px] rounded-md sm:max-w-xs" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-4 border-t bg-white px-8 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full md:h-10 md:w-10" />
          <div className="space-y-2 py-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Skeleton className="h-9 w-[120px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
      </div>
    </div>
  );
}
