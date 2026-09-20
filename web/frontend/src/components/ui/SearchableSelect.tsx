import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/Text";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string | React.ReactNode;
  disabled?: boolean;
  error?: string;
  triggerId?: string;
  required?: boolean;
  labelClassName?: string;
}

export const SearchableSelect = React.memo(function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  disabled,
  error,
  triggerId,
  required,
  labelClassName,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        updatePosition();
      }
      setIsOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        setSearch(e.target.value);
      }, 150);
    },
    [],
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(searchLower));
  }, [options, search]);

  const selectedOption = options.find((opt) => opt === value);

  const handleSelect = useCallback(
    (opt: string) => {
      onChange(opt);
      setIsOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setSearch("");
    },
    [onChange],
  );

  return (
    <div className="space-y-1">
      {label &&
        (typeof label === "string" ? (
          <label
            htmlFor={triggerId}
            className={cn("block text-sm sm:text-base", labelClassName || "text-white")}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        ) : (
          label
        ))}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            "border-input bg-white font-[gothamLight] w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            "data-[placeholder]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            "h-9 cursor-pointer",
            error && "border-red-500",
            isOpen && "ring-[3px] ring-ring/50",
          )}
          data-state={isOpen ? "open" : "closed"}
        >
          <span
            className={cn(
              "flex-1 text-left truncate",
              !selectedOption && "text-gray-500",
            )}
          >
            {selectedOption || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClear(e as unknown as React.MouseEvent);
                  }
                }}
                className="hover:text-red-500 transition-colors cursor-pointer"
                aria-label="Clear selection"
              >
                <X className="size-4" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-4 opacity-50 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </div>
        </button>

        {isOpen && (
          <div
            ref={dropdownRef}
            className="fixed z-[99999] mt-1 bg-white border rounded-md shadow-lg overflow-hidden"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
          >
            <div className="p-2 border-b">
              <div className="flex items-center border rounded-md px-2 bg-white focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  defaultValue={search}
                  onChange={handleSearchChange}
                  placeholder="Search..."
                  className="flex-1 px-2 py-1.5 outline-none text-sm bg-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      if (searchInputRef.current) {
                        searchInputRef.current.value = "";
                      }
                    }}
                    className="hover:text-red-500 transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 text-sm text-center">
                  No results found
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      opt === value &&
                        "bg-accent/50 text-accent-foreground font-medium",
                    )}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <Text className="text-red-600 text-xs">{error}</Text>}
    </div>
  );
});
