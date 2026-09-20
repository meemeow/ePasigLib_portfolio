import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { RadioGroup, RadioGroupItem } from "./RadioGroup";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from "./Select";
import { Popover, PopoverTrigger, PopoverContent } from "./Popover";
import { FunnelIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterSection {
  id: string;
  title: string;
  type: "checkbox" | "radio" | "select";
  options: FilterOption[];
  value: string | string[];
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface FilterPopoverProps {
  sections: FilterSection[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onApply: () => void;
  triggerClassName?: string;
  labelClassName?: string;
  activeFilterCount?: number;
  title: string;
  leftColumnIds: string[];
  rightColumnIds: string[];
  hasResidencySection: boolean;
  hasBarangaySection: boolean;
  barangaySectionId?: string;
  residencySectionId?: string;
  extraContent?: React.ReactNode;
  contentClassName?: string;
}

export function FilterPopover({
  sections,
  isOpen,
  onOpenChange,
  onReset,
  onApply,
  triggerClassName,
  labelClassName = "hidden sm:inline",
  activeFilterCount = 0,
  title,
  leftColumnIds,
  rightColumnIds,
  hasResidencySection,
  hasBarangaySection,
  barangaySectionId = "barangay",
  residencySectionId = "residency",
  extraContent,
  contentClassName,
}: FilterPopoverProps) {
  const hasActiveFilters = activeFilterCount > 0;

  const leftSections = sections.filter((s) => leftColumnIds.includes(s.id));
  const rightSections = sections.filter((s) => rightColumnIds.includes(s.id));

  const barangaySection = sections.find((s) => s.id === barangaySectionId);
  const residencySection = sections.find((s) => s.id === residencySectionId);
  const isPasigResident = residencySection?.value === "Pasig Resident";

  const showBarangay = hasBarangaySection && barangaySection && isPasigResident;

  const leftListed = leftSections.filter(
    (s) => s.id !== residencySectionId || !hasResidencySection,
  );
  const hasLeftColumn =
    leftListed.length > 0 || Boolean(hasResidencySection && residencySection);
  const hasRightColumn = rightSections.length > 0;

  const renderControl = (section: FilterSection) => {
    if (section.type === "select") {
      return (
        <Select
          value={typeof section.value === "string" ? section.value : ""}
          onValueChange={(value) => section.onChange(value)}
          disabled={section.disabled}
        >
          <SelectTrigger className="h-8 text-sm border-gray-200 bg-white">
            <SelectValue placeholder={section.placeholder || "Select"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {section.options.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className="text-sm"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      );
    }

    if (section.type === "radio") {
      return (
        <RadioGroup
          value={typeof section.value === "string" ? section.value : ""}
          onValueChange={(value) => section.onChange(value)}
          className="space-y-1"
        >
          {section.options.map((option) => {
            const optionId = `${section.id}-${option.id}`;
            return (
              <div
                key={option.id}
                className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 transition cursor-pointer"
                onClick={() => {
                  if (!section.disabled) section.onChange(option.id);
                }}
              >
                <RadioGroupItem
                  value={option.id}
                  id={optionId}
                  className="h-3.5 w-3.5 pointer-events-none"
                />
                <label
                  htmlFor={optionId}
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  {option.label}
                </label>
              </div>
            );
          })}
        </RadioGroup>
      );
    }

    return (
      <div className="space-y-1">
        {section.options.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 transition cursor-pointer"
          >
            <Checkbox
              checked={
                Array.isArray(section.value) && section.value.includes(option.id)
              }
              onCheckedChange={() => {
                const current = Array.isArray(section.value)
                  ? section.value
                  : [];
                section.onChange(
                  current.includes(option.id)
                    ? current.filter((v) => v !== option.id)
                    : [...current, option.id],
                );
              }}
              disabled={section.disabled}
              className="h-3.5 w-3.5"
            />
            <span className="text-sm text-gray-700 select-none">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Filters"
          className={cn(
            "h-9 px-3 gap-1.5 border-gray-200 hover:bg-gray-50 transition",
            hasActiveFilters && "bg-blue-50 border-blue-200 text-blue-700",
            triggerClassName,
          )}
        >
          <FunnelIcon className="h-4 w-4" />
          <span className={cn("text-sm font-[gothamMedium]", labelClassName)}>
            Filters
          </span>
          {hasActiveFilters && (
            <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[295px] sm:w-[480px] max-h-[80vh] overflow-y-auto p-4",
          contentClassName,
        )}
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
            {hasActiveFilters && (
              <button
                onClick={onReset}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                Reset
              </button>
            )}
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-x-6 gap-y-3",
              hasLeftColumn && hasRightColumn && "sm:grid-cols-2",
            )}
          >
            {hasLeftColumn && (
            <div className="space-y-3">
              {leftListed.map((section) => (
                <div key={section.id} className="space-y-1">
                  <div className="text-[10px] font-[gothamMedium] text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                  {renderControl(section)}
                </div>
              ))}

              {hasResidencySection && residencySection && (
                <div className="space-y-1">
                  <div className="text-[10px] font-[gothamMedium] text-gray-500 uppercase tracking-wider">
                    {residencySection.title}
                  </div>
                  <RadioGroup
                    value={
                      typeof residencySection.value === "string"
                        ? residencySection.value
                        : ""
                    }
                    onValueChange={(value) => residencySection.onChange(value)}
                    className="space-y-1"
                  >
                    {residencySection.options.map((option) => {
                      const optionId = `${residencySection.id}-${option.id}`;
                      return (
                        <div
                          key={option.id}
                          className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-gray-50 transition cursor-pointer"
                          onClick={() => {
                            if (!residencySection.disabled) {
                              residencySection.onChange(option.id);
                            }
                          }}
                        >
                          <RadioGroupItem
                            value={option.id}
                            id={optionId}
                            className="h-3.5 w-3.5 pointer-events-none"
                          />
                          <label
                            htmlFor={optionId}
                            className="text-sm text-gray-700 cursor-pointer select-none"
                          >
                            {option.label}
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>

                  {showBarangay && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-[gothamMedium] text-gray-400 uppercase tracking-wider">
                        {barangaySection?.title}
                      </div>
                      <Select
                        value={
                          typeof barangaySection?.value === "string"
                            ? barangaySection.value
                            : ""
                        }
                        onValueChange={(value) =>
                          barangaySection?.onChange(value)
                        }
                        disabled={barangaySection?.disabled}
                      >
                        <SelectTrigger className="h-8 text-sm border-gray-200 bg-white mt-0.5">
                          <SelectValue
                            placeholder={
                              barangaySection?.placeholder || "Select"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {barangaySection?.options.map((option) => (
                              <SelectItem
                                key={option.id}
                                value={option.id}
                                className="text-sm"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {hasRightColumn && (
            <div className="space-y-3">
              {rightSections.map((section) => (
                <div key={section.id} className="space-y-1">
                  <div className="text-[10px] font-[gothamMedium] text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                  {renderControl(section)}
                </div>
              ))}
            </div>
            )}
          </div>

          {extraContent && (
            <div className="pt-3 border-t border-gray-100">{extraContent}</div>
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={onApply}
              className="flex-1 h-8 text-xs bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
