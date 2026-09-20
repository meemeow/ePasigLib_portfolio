import type { ReactNode } from "react";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Text } from "@/components/ui/Text";

interface TransactionHeaderProps {
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: ReactNode;
}

export default function TransactionHeader({
  title,
  description,
  onRefresh,
  refreshing,
  actions,
}: TransactionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Text className="text-2xl font-[gothamBlack] uppercase text-[#011b38] sm:text-3xl">
            {title}
          </Text>
          {onRefresh && (
            <RefreshButton
              onClick={onRefresh}
              refreshing={refreshing}
              className="ml-0.5 mt-0.5"
              label={`Refresh ${title}`}
            />
          )}
        </div>
        <Text className="mt-1 text-sm text-gray-600">{description}</Text>
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}
