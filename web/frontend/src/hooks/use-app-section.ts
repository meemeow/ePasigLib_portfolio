import { useLocation } from "react-router-dom";

export type AppSection = "lms" | "opac";

export interface AppSectionInfo {
  isLMS: boolean;
  section: AppSection;
  base: string;
  pathname: string;
}

export function useAppSection(): AppSectionInfo {
  const { pathname } = useLocation();
  const isLMS = pathname.startsWith("/lms");

  return {
    isLMS,
    section: isLMS ? "lms" : "opac",
    base: isLMS ? "/lms" : "/opac",
    pathname,
  };
}
