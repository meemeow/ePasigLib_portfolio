import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import type { ProfileTab } from "@/features/lms/profile/types/profile-types";

interface ProfileSidebarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

const tabs: Array<{ value: ProfileTab; label: string }> = [
  { value: "home", label: "Home" },
  { value: "roles", label: "Roles & Permissions" },
  { value: "modification_logs", label: "Modification Logs" },
];

export default function ProfileSidebar({
  activeTab,
  onTabChange,
}: ProfileSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-2 pb-4 py-6 sm:grid sm:grid-cols-2 sm:items-center sm:gap-0 md:py-8 xl:flex xl:w-56 xl:flex-col xl:items-stretch xl:justify-start xl:space-y-4 xl:p-2">
      <Text className="order-1 text-left sm:order-none sm:col-start-1 sm:justify-self-start text-3xl font-[gothamBlack] leading-tight text-[#011b38] uppercase xl:text-left xl:w-full xl:mb-3 xl:justify-self-auto">
        MY PROFILE
      </Text>

      <div className="order-2 w-full sm:col-start-2 sm:w-auto sm:justify-self-end xl:mt-4 xl:w-full">
        <div className="block xl:hidden">
          <Select
            value={activeTab}
            onValueChange={(value) => onTabChange(value as ProfileTab)}
          >
            <SelectTrigger className="w-full sm:w-[175px] md:w-[200px] lg:w-[230px] border-[#003067] text-[#003067] font-[gothamMedium] text-sm h-10">
              <SelectValue placeholder="Select tab" />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden xl:flex flex-col gap-1">
          {tabs.map((tab) => (
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
    </div>
  );
}
