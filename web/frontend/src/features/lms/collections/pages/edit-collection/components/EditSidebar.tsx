import { ArrowLeft } from "lucide-react";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

interface EditSidebarProps {
  title: string;
  onReturn: () => void;
}

export default function EditSidebar({ title, onReturn }: EditSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-3 py-6 md:py-8 xl:w-64 xl:shrink-0 xl:p-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
        <div className="order-1 sm:order-2 sm:text-center xl:order-1 xl:text-left">
          <Text className="text-3xl leading-tight font-[gothamBlack] text-[#011b38] uppercase">
            EDIT COLLECTION
          </Text>
          {title && (
            <Text className="mt-1 line-clamp-2 text-xs text-gray-500">
              {title}
            </Text>
          )}
        </div>
        <Button
          variant="outline"
          onClick={onReturn}
          className={`order-2 w-full shrink-0 sm:order-1 sm:w-[130px] md:w-[150px] lg:w-[200px] xl:mt-3 xl:w-full ${COMPACT_CONTROL}`}
        >
          <ArrowLeft className="size-4" />
          Return
        </Button>
      </div>
    </div>
  );
}
