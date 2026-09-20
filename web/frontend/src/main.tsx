import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { routes } from "@/app/routes";

const container = document.getElementById("root");
if (container && !(container as any)._reactRootContainer) {
  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={routes} />
    </StrictMode>
  );
}