import { Button } from "./Button";
import { Popover, PopoverTrigger, PopoverContent } from "./Popover";
import { RadioGroup, RadioGroupItem } from "./RadioGroup";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from "./Select";
import { Text } from "./Text";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SortOption {
  id: string;
  label: string;
}

interface SortPopoverProps {
  options: SortOption[];
  value: string;
  direction: "asc" | "desc";
  onValueChange: (value: string) => void;
  onDirectionChange: (direction: "asc" | "desc") => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
  onReset: () => void;
  triggerClassName?: string;
  labelClassName?: string;
  activeSortCount?: number;
  title: string;
}

export function SortPopover({
  options,
  value,
  direction,
  onValueChange,
  onDirectionChange,
  isOpen,
  onOpenChange,
  onApply,
  onReset,
  triggerClassName,
  labelClassName = "hidden sm:inline",
  activeSortCount = 0,
  title,
}: SortPopoverProps) {
  const hasActiveSort = activeSortCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Sort"
          className={cn(
            "h-9 px-3 gap-1.5 border-gray-200 hover:bg-gray-50 transition",
            hasActiveSort && "bg-blue-50 border-blue-200 text-blue-700",
            triggerClassName
          )}
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className={cn("text-sm font-[gothamMedium]", labelClassName)}>
            Sort
          </span>
          {hasActiveSort && (
            <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {activeSortCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] sm:w-[380px] max-h-[80vh] overflow-y-auto p-4"
        align="end"
        side="bottom"
        sideOffset={8}
        avoidCollisions={false}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-[gothamMedium] text-gray-500 uppercase tracking-wider">
              {title}
            </div>
            {hasActiveSort && (
              <button
                onClick={onReset}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-[gothamMedium] text-gray-500 uppercase tracking-wider">
              Sort By
            </div>
            <RadioGroup
              value={value}
              onValueChange={(val) => onValueChange(val)}
              className="space-y-1"
            >
              {options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => onValueChange(option.id)}
                >
                  <RadioGroupItem
                    value={option.id}
                    id={`sort-${option.id}`}
                    className="h-3.5 w-3.5 pointer-events-none"
                  />
                  <label
                    htmlFor={`sort-${option.id}`}
                    className="text-sm text-gray-700 cursor-pointer select-none"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-[gothamMedium] text-gray-500 uppercase tracking-wider">
              Direction
            </div>
            <Select
              value={direction}
              onValueChange={(val) => onDirectionChange(val as "asc" | "desc")}
            >
              <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="asc" className="text-sm">
                    <Text className="flex items-center gap-2 text-sm text-gray-800">
                      Ascending
                    </Text>
                  </SelectItem>
                  <SelectItem value="desc" className="text-sm">
                    <Text className="flex items-center gap-2 text-sm text-gray-800">
                      Descending
                    </Text>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={onApply}
              className="flex-1 h-8 text-xs bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply Sort
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
