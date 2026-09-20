import * as React from "react";
import { createPortal } from "react-dom";
import { Calendar } from "./Calendar";
import { Input } from "./Input";
import { Text } from "./Text";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

const GAP = 4;

const ESTIMATED_HEIGHT = 380;

interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  onBlur?: () => void;
  label?: string | React.ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  max?: string;
  min?: string;
  id?: string;
  name?: string;
  labelClassName?: string;
  allowedDates?: string[];
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  label,
  error,
  required,
  disabled,
  placeholder = "Select date",
  max,
  min,
  id,
  name,
  labelClassName,
  allowedDates,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(
    value ? new Date(value) : null,
  );

  const calendarRef = React.useRef<HTMLDivElement>(null);
  const inputContainerRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    width: number;
  }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const parseDay = (value?: string): Date | undefined => {
    if (!value) return undefined;
    const parts = /^(d{4})-(d{2})-(d{2})$/.exec(value);
    return parts
      ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
      : new Date(value);
  };

  const maxDate = parseDay(max);
  const minDate = parseDay(min);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDisplay = (date: Date): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const updatePosition = React.useCallback(() => {
    if (!inputContainerRef.current) return;
    const rect = inputContainerRef.current.getBoundingClientRect();

    const height = calendarRef.current?.offsetHeight ?? ESTIMATED_HEIGHT;
    const width = calendarRef.current?.offsetWidth ?? Math.max(rect.width, 280);

    const below = window.innerHeight - rect.bottom;
    const flip = below < height + GAP && rect.top > below;

    const top = flip ? rect.top - height - GAP : rect.bottom + GAP;
    const left = Math.max(
      GAP,
      Math.min(rect.left, window.innerWidth - width - GAP),
    );

    setCoords({
      top: top + window.scrollY,
      left: left + window.scrollX,
      width: rect.width,
    });
  }, []);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dateStr = formatDate(date);
    if (onChange) {
      onChange(dateStr);
    }
    setIsOpen(false);
  };

  const handleInputClick = () => {
    if (!disabled) {
      if (!isOpen) {
        updatePosition();
      }
      setIsOpen(!isOpen);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node) &&
        inputContainerRef.current &&
        !inputContainerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useLayoutEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    if (isOpen) {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const getInitialMonth = React.useMemo(() => {
    if (selectedDate) return selectedDate;
    if (maxDate) {
      return new Date(maxDate);
    }
    return new Date();
  }, [selectedDate, maxDate]);

  return (
    <div className="space-y-1">
      {label &&
        (typeof label === "string" ? (
          <label
            htmlFor={id}
            className={cn(
              "block text-sm sm:text-base",
              labelClassName || "text-white",
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        ) : (
          label
        ))}

      <div className="relative" ref={inputContainerRef}>
        <Input
          id={id}
          name={name}
          type="text"
          value={selectedDate ? formatDisplay(selectedDate) : ""}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("cursor-pointer pr-10", error && "border-red-500")}
          onClick={handleInputClick}
          onBlur={onBlur}
          readOnly
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
          onClick={handleInputClick}
        >
          <CalendarIcon className="h-4 w-4 text-gray-600" />
        </div>
      </div>

      {error && <Text className="text-red-600 text-xs">{error}</Text>}

      {isOpen &&
        createPortal(
          <div
            ref={calendarRef}
            className="fixed z-[99999] min-w-[280px]"
            style={{
              top: `${coords.top - window.scrollY}px`,
              left: `${coords.left - window.scrollX}px`,
            }}
          >
            <Calendar
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              onClose={() => setIsOpen(false)}
              maxDate={maxDate}
              minDate={minDate}
              allowedDates={allowedDates}
              initialMonth={getInitialMonth}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
