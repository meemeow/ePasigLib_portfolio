import { useEffect, useState } from "react";
import { Bookmark, Library, ShoppingCart, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type FaceKey = "saved" | "cart" | "books";

const FACES: { key: FaceKey; Icon: LucideIcon; label: string }[] = [
  { key: "saved", Icon: Bookmark, label: "saved" },
  { key: "cart", Icon: ShoppingCart, label: "in cart" },
  { key: "books", Icon: Library, label: "borrowed or on hold" },
];

const HOLD_MS = 3000;

const FADE_MS = 900;

interface CartFabProps {
  counts: Record<FaceKey, number>;
  onOpen: () => void;
}

export function CartFab({ counts, onOpen }: CartFabProps) {
  const [face, setFace] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setFace(1);
      return;
    }
    const timer = setInterval(
      () => setFace((current) => (current + 1) % FACES.length),
      HOLD_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed right-8 z-30 xs:right-9 sm:right-12"
      style={{ bottom: "calc(2.65rem + env(safe-area-inset-bottom))" }}
    >
      <Button
        onClick={onOpen}
        aria-label={`Open my cart — ${FACES.map(
          ({ key, label }) => `${counts[key]} ${label}`,
        ).join(", ")}`}
        title="Open my cart"
        className={cn(
          "relative h-14 w-14 xs:h-16 xs:w-16 p-0 rounded-full text-white hover:no-underline",
          "bg-gradient-to-br from-[#128CF1] via-[#0F76CC] to-[#003067]",
          "shadow-[0_10px_30px_-6px_rgba(0,48,103,0.5)] ring-4 ring-white/70",
          "transition-[transform,box-shadow] duration-300 ease-out",
          "hover:scale-105 hover:shadow-[0_16px_40px_-8px_rgba(0,48,103,0.65)]",
          "active:scale-95",
        )}
      >
        <span className="relative block size-6">
          {FACES.map(({ key, Icon }, index) => (
            <Icon
              key={key}
              aria-hidden
              className={cn(
                "absolute inset-0 size-6 transition-all ease-in-out",
                "motion-reduce:transition-none",
                index === face
                  ? "rotate-0 scale-100 opacity-100"
                  : "-rotate-90 scale-50 opacity-0",
              )}
              style={{ transitionDuration: `${FADE_MS}ms` }}
            />
          ))}
        </span>

        {FACES.map(({ key }, index) =>
          counts[key] > 0 ? (
            <span
              key={key}
              aria-hidden
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-[gothamBlack] text-white ring-2 ring-white",
                "transition-all ease-in-out motion-reduce:transition-none",
                index === face ? "scale-100 opacity-100" : "scale-50 opacity-0",
              )}
              style={{ transitionDuration: `${FADE_MS}ms` }}
            >
              {counts[key] > 99 ? "99+" : counts[key]}
            </span>
          ) : null,
        )}
      </Button>
    </div>
  );
}
