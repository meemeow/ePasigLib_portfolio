import { Outlet } from "react-router-dom";
import CirculationsSidebar from "@/features/lms/circulations/components/CirculationsSidebar";

export default function CirculationsLayout() {
  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col font-[gothamLight] xl:flex-row">
      <CirculationsSidebar />
      <main className="min-w-0 flex-1 px-6 pb-6 pt-2 sm:px-8 sm:pb-10 md:py-6 xl:p-10">
        <Outlet />
      </main>
    </div>
  );
}
