import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/use-auth";
import {
  RECORD_SECTIONS,
  SECTION_CONFIG,
  SECTION_ROLE,
  TRANSACTION_PAGES,
} from "@/features/lms/circulations/api/circulation-sections";

export default function CirculationsIndex() {
  const { staffRoles } = useAuth();
  const roles = (staffRoles || {}) as Record<string, boolean | undefined>;

  const transaction = TRANSACTION_PAGES.find((page) => roles[page.role]);
  if (transaction) {
    return <Navigate to={`/lms/circulations/${transaction.slug}`} replace />;
  }

  const section = RECORD_SECTIONS.find((s) => {
    const role = SECTION_ROLE[s];
    return !role || roles[role];
  });
  if (section) {
    return (
      <Navigate
        to={`/lms/circulations/${SECTION_CONFIG[section].slug}`}
        replace
      />
    );
  }

  return <Navigate to="/unauthorized" replace />;
}
