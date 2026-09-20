import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface SegmentedRailProps {
  activeKey: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

interface Thumb {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function SegmentedRail({
  activeKey,
  ariaLabel,
  className = "",
  children,
}: SegmentedRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const measuredRef = useRef(false);
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const segment = rail.querySelector<HTMLElement>(
      '[data-segment-active="true"]',
    );
    if (!segment) {
      setThumb(null);
      return;
    }
    setThumb({
      left: segment.offsetLeft,
      top: segment.offsetTop,
      width: segment.offsetWidth,
      height: segment.offsetHeight,
    });
    if (measuredRef.current) setAnimate(true);
    measuredRef.current = true;
  }, []);

  useLayoutEffect(() => {
    measure();
    const rail = railRef.current;
    if (!rail) return;
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [measure, activeKey]);

  return (
    <div
      ref={railRef}
      role="group"
      aria-label={ariaLabel}
      className={`relative ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 rounded-full bg-[#003067] ${
          thumb ? "opacity-100" : "opacity-0"
        } ${
          animate
            ? "transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            : ""
        }`}
        style={
          thumb
            ? {
                transform: `translate3d(${thumb.left}px, ${thumb.top}px, 0)`,
                width: thumb.width,
                height: thumb.height,
              }
            : undefined
        }
      />
      {children}
    </div>
  );
}

export function segmentClasses(active: boolean) {
  return `relative rounded-full px-3 py-1 text-xs font-[gothamMedium] transition-colors duration-200 ${
    active ? "text-white" : "text-[#003067] hover:bg-[#EAF4FE]"
  }`;
}
