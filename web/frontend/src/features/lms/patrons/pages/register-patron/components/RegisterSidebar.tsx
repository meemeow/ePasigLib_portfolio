import { Button } from "@/components/ui/Button";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Text } from "@/components/ui/Text";

interface RegisterSidebarProps {
  onReturn: () => void;
}

export default function RegisterSidebar({ onReturn }: RegisterSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0 md:py-8 xl:w-56 xl:flex-col xl:items-stretch xl:justify-start xl:space-y-4 xl:p-2">
      <Button
        variant="outline"
        onClick={onReturn}
        className={`order-2 w-full shrink-0 sm:order-1 sm:w-[130px] md:w-[150px] lg:w-[200px] xl:order-2 xl:w-full ${COMPACT_CONTROL}`}
      >
        ← Return
      </Button>

      <Text className="order-1 text-left sm:order-2 md:text-center text-3xl sm:text-3xl font-[gothamBlack] leading-tight text-[#011b38] uppercase xl:order-1 xl:text-left xl:w-full xl:mb-3">
        ADD PATRON
      </Text>

      <div
        className="order-3 hidden md:block md:w-[150px] lg:w-[200px] xl:hidden shrink-0"
        aria-hidden="true"
      />
    </div>
  );
}