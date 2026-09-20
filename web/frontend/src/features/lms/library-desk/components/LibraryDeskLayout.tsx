import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import LibraryDeskSidebar from "@/features/lms/library-desk/components/LibraryDeskSidebar";
import { DeskRailContext } from "@/features/lms/library-desk/api/desk-rail-context";

export default function LibraryDeskLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const rail = useMemo(() => ({ collapsed }), [collapsed]);

  return (
    <DeskRailContext.Provider value={rail}>
      <div className="flex min-h-[calc(100vh-160px)] flex-col font-[gothamLight] lg:flex-row">
        <LibraryDeskSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((current) => !current)}
        />
        <main className="min-w-0 flex-1 px-6 pb-6 pt-2 sm:px-8 sm:pb-10 md:py-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </DeskRailContext.Provider>
  );
}
