import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BreadcrumbLabelValue {
  label: string | null;
  setLabel: (value: string | null) => void;
}

const BreadcrumbLabelContext = createContext<BreadcrumbLabelValue>({
  label: null,
  setLabel: () => undefined,
});

export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ label, setLabel }), [label]);
  return (
    <BreadcrumbLabelContext.Provider value={value}>
      {children}
    </BreadcrumbLabelContext.Provider>
  );
}

export function useBreadcrumbLabel(): string | null {
  return useContext(BreadcrumbLabelContext).label;
}

export function usePublishBreadcrumbLabel(label: string | null): void {
  const { setLabel } = useContext(BreadcrumbLabelContext);
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
}
