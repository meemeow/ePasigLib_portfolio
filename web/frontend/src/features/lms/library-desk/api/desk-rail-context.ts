import { createContext, useContext } from "react";

export const DeskRailContext = createContext<{ collapsed: boolean }>({
  collapsed: false,
});

export function useDeskRail(): { collapsed: boolean } {
  return useContext(DeskRailContext);
}
