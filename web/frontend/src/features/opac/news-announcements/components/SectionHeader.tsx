import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
  action?: ReactNode;
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  className,
  action,
}: SectionHeaderProps) {
  return (
    <div className={cn("bg-[#003067] px-5 py-4 sm:px-6 sm:py-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE]/20 text-white sm:size-10">
          {icon}
        </div>
        <div className="min-w-0">
          <Text className="font-[gothamMedium] text-base text-white sm:text-lg">
            {title}
          </Text>
          <Text className="text-xs text-white/70">{subtitle}</Text>
        </div>
      </div>
      {action}
      </div>
    </div>
  );
}

export default SectionHeader;

export function SectionHeaderButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-[gothamMedium] transition-colors",
        "border-white/25 text-white/90 hover:border-white/50 hover:bg-white/10",
        "disabled:cursor-default disabled:border-white/10 disabled:text-white/35 disabled:hover:bg-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}
