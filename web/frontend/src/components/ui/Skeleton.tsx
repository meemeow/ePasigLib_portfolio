import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-[#DCE7F5]",
        "after:absolute after:inset-0 after:content-['']",
        "after:bg-gradient-to-r after:from-transparent after:via-white/75 after:to-transparent",
        "after:animate-skeleton-sweep",
        "motion-reduce:after:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
