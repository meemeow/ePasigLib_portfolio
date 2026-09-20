import { cn } from "@/lib/utils";
import { Input } from "./Input";
import { Search as SearchIcon } from "lucide-react";

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
}

export function Search({
  value,
  onChange,
  placeholder = "Search...",
  className,
  containerClassName,
  disabled,
}: SearchProps) {
  return (
    <div className={cn("relative w-full md:w-[330px]", containerClassName)}>
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("pl-9 placeholder:text-sm", className)}
        disabled={disabled}
      />
    </div>
  );
}
