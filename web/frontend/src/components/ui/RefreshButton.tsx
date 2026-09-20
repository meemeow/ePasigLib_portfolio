import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onClick: () => void;
  refreshing?: boolean;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
  label?: string;
}

export function RefreshButton({
  onClick,
  refreshing = false,
  disabled = false,
  className,
  iconClassName,
  label = "Refresh",
}: RefreshButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      disabled={disabled || refreshing}
      aria-label={label}
      title={label}
      className={cn("h-7 w-7 shrink-0", className)}
    >
      <RefreshCcw
        className={cn(
          "size-3.5",
          refreshing && "animate-spin [animation-direction:reverse]",
          iconClassName,
        )}
      />
    </Button>
  );
}
