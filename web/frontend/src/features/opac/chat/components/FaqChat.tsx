import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  faqAnswer,
  FAQ_GREETING,
  FAQ_REPLY_MS,
  LIBRARY_FAQS,
  type LibraryFaq,
} from "@/features/opac/chat/api/faq-content";
import { useLibraryStatus } from "@/hooks/use-library-status";
import {
  readFaqLog,
  writeFaqLog,
  type FaqTurn,
} from "@/features/opac/chat/api/faq-session";

export default function FaqChat() {
  const [log, setLog] = useState<FaqTurn[]>(readFaqLog);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<FaqTurn | null>(null);

  const status = useLibraryStatus();

  useEffect(() => {
    writeFaqLog(log);
  }, [log]);

  useEffect(() => {
    const row = chipsRef.current;
    if (!row) return;

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (row.scrollWidth <= row.clientWidth) return;
      event.preventDefault();
      row.scrollLeft += event.deltaY;
    };

    row.addEventListener("wheel", onWheel, { passive: false });
    return () => row.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current) {
        writeFaqLog([...readFaqLog(), pendingRef.current]);
        pendingRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [log, thinking]);

  const ask = (faq: LibraryFaq): void => {
    if (thinking) return;

    const stamp = Date.now();
    setLog((turns) => [
      ...turns,
      { id: `${faq.id}-q-${stamp}`, role: "patron", text: faq.question },
    ]);
    setThinking(true);

    const answer: FaqTurn = {
      id: `${faq.id}-a-${stamp}`,
      role: "mutya",
      text: faqAnswer(faq, { status }),
    };
    pendingRef.current = answer;

    timerRef.current = setTimeout(() => {
      pendingRef.current = null;
      setLog((turns) => [...turns, answer]);
      setThinking(false);
    }, FAQ_REPLY_MS);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div
        ref={scrollRef}
        className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4"
      >
        <Bubble role="mutya">{FAQ_GREETING}</Bubble>

        {log.map((turn) => (
          <Bubble key={turn.id} role={turn.role}>
            {turn.text}
          </Bubble>
        ))}

        {thinking && (
          <div className="flex items-end gap-2">
            <MutyaAvatar />
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3.5 py-3">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1.5 animate-bounce rounded-full bg-gray-400"
                  style={{ animationDelay: `${dot * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        <Text className="mb-2 text-[11px] font-[gothamMedium] uppercase tracking-wide text-gray-400">
          Common questions
        </Text>

        <div
          ref={chipsRef}
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:mx-4 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5"
        >
          {LIBRARY_FAQS.map((faq) => (
            <Button
              key={faq.id}
              type="button"
              variant={null}
              size={null}
              disabled={thinking}
              onClick={() => ask(faq)}
              className="shrink-0 whitespace-nowrap rounded-full border border-[#128CF1]/30 bg-[#EAF4FE] px-3 py-1.5 text-left text-[12px] font-normal font-[gothamMedium] text-[#0F76CC] transition hover:border-[#128CF1] hover:bg-[#128CF1] hover:text-white hover:no-underline disabled:opacity-50"
            >
              {faq.question}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: FaqTurn["role"];
  children: React.ReactNode;
}) {
  if (role === "patron") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#128CF1] px-3.5 py-2.5 text-sm leading-relaxed text-white">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <MutyaAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm leading-relaxed text-[#011b38]">
        {children}
      </div>
    </div>
  );
}

function MutyaAvatar() {
  return (
    <span className="relative block size-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#128CF1] via-[#0F76CC] to-[#003067] shadow-sm ring-2 ring-[#128CF1]/45 ring-offset-1 ring-offset-white">
      <img
        src="/assets/images/mutya.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 w-[500%] max-w-none -translate-x-1/2 -translate-y-[18%] select-none"
      />
    </span>
  );
}
