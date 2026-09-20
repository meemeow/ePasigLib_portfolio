import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

export type OpacViewTab = "details" | "related" | "marc";

const TABS: Array<{ value: OpacViewTab; label: string }> = [
  { value: "details", label: "Details" },
  { value: "related", label: "Related Books" },
  { value: "marc", label: "MARC" },
];

interface CollectionViewSidebarProps {
  activeTab: OpacViewTab;
  onTabChange: (tab: OpacViewTab) => void;
  onReturn: () => void;
  actions?: ReactNode;
}

export default function CollectionViewSidebar({
  activeTab,
  onTabChange,
  onReturn,
  actions,
}: CollectionViewSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-2 pt-5 pb-3 sm:grid sm:grid-cols-2 sm:items-center sm:gap-x-0 sm:gap-y-2 xl:flex xl:w-56 xl:flex-col xl:items-stretch xl:justify-start xl:space-y-4 xl:p-2">
      <Button
        variant="outline"
        onClick={onReturn}
        className="order-2 mb-2 w-full shrink-0 sm:order-none sm:col-start-1 sm:row-start-2 sm:justify-self-start sm:w-[150px] md:w-[175px] lg:w-[230px] xl:order-2 xl:w-full"
      >
        ← Return
      </Button>

      <Text className="order-1 text-left sm:order-none sm:col-start-1 sm:row-start-1 sm:justify-self-start text-3xl font-[gothamBlack] leading-tight text-[#011b38] uppercase xl:order-1 xl:text-left xl:w-full xl:mb-3 xl:justify-self-auto">
        VIEW COLLECTION
      </Text>

      <div className="order-4 w-full sm:col-start-2 sm:row-start-1 sm:w-auto sm:justify-self-end xl:order-3 xl:mt-4 xl:w-full">
        <div className="block xl:hidden">
          <Select
            value={activeTab}
            onValueChange={(value) => onTabChange(value as OpacViewTab)}
          >
            <SelectTrigger className="w-full sm:w-[150px] md:w-[175px] lg:w-[230px] border-[#003067] text-[#003067] font-[gothamMedium] text-sm h-10">
              <SelectValue placeholder="Select tab" />
            </SelectTrigger>
            <SelectContent>
              {TABS.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden xl:flex flex-col gap-1">
          {TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={null}
              size={null}
              onClick={() => onTabChange(tab.value)}
              className={`w-full justify-start whitespace-normal font-normal text-left px-4 py-3 rounded-lg text-sm font-[gothamMedium] transition ${
                activeTab === tab.value
                  ? "bg-[#128CF1] text-white"
                  : "bg-[#003067] text-white hover:bg-[#003067]/80"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {actions && (
        <div className="order-5 flex w-full flex-wrap justify-end gap-2 sm:col-start-2 sm:row-start-2 sm:w-auto sm:justify-self-end xl:hidden">
          {actions}
        </div>
      )}
    </div>
  );
}
