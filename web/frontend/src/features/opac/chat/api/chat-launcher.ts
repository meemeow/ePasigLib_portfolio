import { useEffect } from "react";

export type ChatTab = "faqs" | "librarian";

type Handler = (tab: ChatTab) => void;

const handlers = new Set<Handler>();

export function openChat(tab: ChatTab = "librarian"): void {
  for (const handler of handlers) handler(tab);
}

export function useChatLauncher(handler: Handler): void {
  useEffect(() => {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }, [handler]);
}
