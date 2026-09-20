import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";
import {
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/features/lms/collections/pages/view-collection/constants/type-scale";

interface CollectionViewPanelProps {
  icon: LucideIcon;
  title: string;
  caption: string;
  aside?: ReactNode;
  children: ReactNode;
}

export default function CollectionViewPanel({
  icon: Icon,
  title,
  caption,
  aside,
  children,
}: CollectionViewPanelProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      <div className="bg-[#003067] px-6 py-4 sm:px-8 sm:py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <Text className={`font-[gothamMedium] text-white ${TEXT_PRIMARY}`}>
                {title}
              </Text>
              <Text className={`text-white/70 ${TEXT_SECONDARY}`}>
                {caption}
              </Text>
            </div>
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </div>

      <div className="flex-1 p-7 pb-4 pt-6 sm:p-8 sm:pb-6 sm:pt-6 md:p-10 md:pt-8">
        {children}
      </div>
    </div>
  );
}
