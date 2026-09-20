import { ArrowLeft } from "lucide-react";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import IsbnLookupCard from "@/features/lms/collections/pages/register-collection/components/IsbnLookupCard";
import type {
  GoogleBooksVolume,
  IsbnLookupState,
} from "@/features/lms/collections/pages/register-collection/types/collections-register-types";

interface RegisterSidebarProps {
  isbn: string;
  onIsbnChange: (value: string) => void;
  onClearIsbn: () => void;
  state: IsbnLookupState;
  volume: GoogleBooksVolume | null;
  onReturn: () => void;
}

export default function RegisterSidebar({
  isbn,
  onIsbnChange,
  onClearIsbn,
  state,
  volume,
  onReturn,
}: RegisterSidebarProps) {
  return (
    <div className="flex w-full flex-col gap-3 py-6 md:py-8 xl:w-64 xl:shrink-0 xl:p-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
        <Text className="order-1 text-3xl leading-tight font-[gothamBlack] text-[#011b38] uppercase sm:order-2 sm:text-center xl:order-1 xl:mb-3 xl:text-left">
          ADD COLLECTION
        </Text>
        <Button
          variant="outline"
          onClick={onReturn}
          className={`order-2 w-full shrink-0 sm:order-1 sm:w-[130px] md:w-[150px] lg:w-[200px] xl:w-full ${COMPACT_CONTROL}`}
        >
          <ArrowLeft className="size-4" />
          Return
        </Button>
      </div>

      <IsbnLookupCard
        isbn={isbn}
        onIsbnChange={onIsbnChange}
        onClear={onClearIsbn}
        state={state}
        volume={volume}
        hint="Autofill from Google Books. Overwrites matching fields."
      />
    </div>
  );
}
