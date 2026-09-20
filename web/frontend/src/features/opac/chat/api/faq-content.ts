import {
  CLOSING_TIME,
  OPENING_TIME,
  OPEN_DAYS,
  type LibraryStatus,
} from "@/lib/library-hours";
import { DEFAULT_CART_POLICY } from "@/features/opac/collections/components/cart-utils";

export interface FaqAnswerContext {
  status: LibraryStatus;
}

export interface LibraryFaq {
  id: string;
  question: string;
  answer: string | ((context: FaqAnswerContext) => string);
}

export function faqAnswer(faq: LibraryFaq, context: FaqAnswerContext): string {
  return typeof faq.answer === "function" ? faq.answer(context) : faq.answer;
}

export const LIBRARY_FAQS: readonly LibraryFaq[] = [
  {
    id: "hours",
    question: "What are the library hours?",
    answer: ({ status }) =>
      `We're open ${OPEN_DAYS}, ${OPENING_TIME} to ${CLOSING_TIME}. We're closed on Sundays and on public holidays, and once in a while we have to close at short notice. Today: ${status.statusDetail}.`,
  },
  {
    id: "location",
    question: "Where is the library?",
    answer:
      "You'll find us on Caruncho Ave., Brgy. San Nicolas, Pasig City — beside Pasig Elementary School and the Pasig Schools Division Office. You can reach the desk at (02) 8809 0498.",
  },
  {
    id: "borrowing",
    question: "How do I borrow a book?",
    answer:
      "Search for the title under Collections and add it to your cart, then submit the request from there — the copy is set aside for you the moment you ask, and a librarian confirms it. There's no library card to carry: just bring one valid ID, government-issued or school, to the circulation desk when you collect it.",
  },
  {
    id: "returning",
    question: "How do I return or renew a book?",
    answer:
      "Return your books at the circulation desk on or before the due date. Open the cart button on the Collections page to see what you have out and when it's due under My Books — and you can renew a loan yourself under Renewal, once the due date is close and as long as it isn't overdue yet.",
  },
  {
    id: "overdue",
    question: "What if my book is overdue?",
    answer:
      "There are no fines. What happens instead is that your account standing steps down a level each time something comes back late — Verified → Watchlisted → Warning → Suspended — and a suspended account can't borrow, reserve or renew. That last step is permanent, so the levels above it are the warnings that matter. There's no grace period, so a book is overdue the day after it's due, and an overdue loan can't be renewed. Bring it back to the circulation desk as soon as you can, and talk to us if something's happened to it.",
  },
  {
    id: "reservation",
    question: "Can I reserve a book?",
    answer: `Yes, as long as a copy of that title is free — add it to your cart and submit the request, and that copy is held in your name straight away. Once a librarian approves it you'll get a notification, and you'll have ${DEFAULT_CART_POLICY.PickupWindowDays} open days to collect it, so days we're closed don't count against you. If every copy is already out, you'll need to wait for one to come back.`,
  },
] as const;

export const FAQ_GREETING =
  "Hi! Tap a question below and I'll answer it right away.";

export const FAQ_REPLY_MS = 550;
