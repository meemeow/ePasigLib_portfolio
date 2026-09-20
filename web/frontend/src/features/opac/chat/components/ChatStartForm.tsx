import { useEffect, useState, type FormEvent } from "react";
import {
  BookMarked,
  Clock,
  FileText,
  Loader2,
  PlusCircle,
  Send,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Textarea } from "@/components/ui/Textarea";
import { Text } from "@/components/ui/Text";
import {
  CHAT_CONCERNS,
  SCHOOL_WORK,
} from "@/lib/constants/hardcoded-constants";
import { cn } from "@/lib/utils";
import type { GuestInfo } from "@/features/lms/library-desk/types/chat-types";
import type { StartFormValues } from "@/features/opac/chat/api/opac-chat-logic";

interface ChatStartFormProps {
  isSignedIn: boolean;
  patronName: string;
  submitting: boolean;
  onSubmit: (values: StartFormValues) => void;
}

const NAVY = "#002248";

const FIELD_LABEL = "text-[#003067] text-xs sm:text-sm font-[gothamMedium]";

const MIN_AGE = 4;
const MAX_AGE = 122;

const CONCERN_ICONS = [FileText, BookMarked, User, Clock, PlusCircle];

const CONCERNS = CHAT_CONCERNS.map((label, index) => ({
  label,
  icon: CONCERN_ICONS[index],
}));

export default function ChatStartForm({
  isSignedIn,
  patronName,
  submitting,
  onSubmit,
}: ChatStartFormProps) {
  const [concern, setConcern] = useState(CONCERNS[0].label);
  const [description, setDescription] = useState("");
  const [guest, setGuest] = useState<GuestInfo>({
    FullName: "",
    School: "",
    City: "",
    Barangay: "",
    Age: "",
  });
  const [touched, setTouched] = useState(false);

  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);

  useEffect(() => {
    if (isSignedIn) return;
    let live = true;
    void (async () => {
      const { getCities } = await import("@/lib/constants/cities_barangays");
      const list = await getCities();
      if (live) setCities(list);
    })();
    return () => {
      live = false;
    };
  }, [isSignedIn]);

  const city = guest.City;
  useEffect(() => {
    if (isSignedIn || !city) {
      setBarangays([]);
      return;
    }
    let live = true;
    void (async () => {
      const { getBarangays } = await import("@/lib/constants/cities_barangays");
      const list = await getBarangays(city);
      if (live) setBarangays(list);
    })();
    return () => {
      live = false;
    };
  }, [isSignedIn, city]);

  const needsName = !isSignedIn && !guest.FullName.trim();
  const needsQuestion = !description.trim();
  const typedAge = guest.Age.trim();
  const badAge =
    typedAge !== "" &&
    !(
      /^\d+$/.test(typedAge) &&
      Number(typedAge) >= MIN_AGE &&
      Number(typedAge) <= MAX_AGE
    );
  const invalid = needsQuestion || needsName || badAge;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (invalid || submitting) return;
    onSubmit({ Concern: concern, Description: description.trim(), guest });
  };

  const field = (
    label: string,
    key: keyof GuestInfo,
    placeholder = "",
    required = false,
  ) => (
    <Input
      id={`chat-guest-${key}`}
      name={key}
      label={label}
      required={required}
      value={guest[key]}
      placeholder={placeholder}
      disabled={submitting}
      onChange={(event) => setGuest({ ...guest, [key]: event.target.value })}
      error={
        required && touched && !guest[key].trim()
          ? `${label} is required.`
          : undefined
      }
      labelClassName={FIELD_LABEL}
      className="text-sm"
    />
  );

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div>
          <Text
            as="div"
            className="text-base font-[gothamBlack]"
            style={{ color: NAVY }}
          >
            {isSignedIn
              ? `Hi ${patronName || "there"}! 👋`
              : "Let's get you connected."}
          </Text>
          <Text as="div" className="mt-1 text-sm leading-snug text-gray-600">
            {isSignedIn
              ? "Pick what it's about, tell us a little more, and a librarian will take it from there."
              : "Tell us a bit about yourself so the desk knows who they're helping."}
          </Text>
        </div>

        {!isSignedIn && (
          <div className="space-y-3">
            {field("Your name", "FullName", "Juan dela Cruz", true)}
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={guest.School}
                onValueChange={(value) => setGuest({ ...guest, School: value })}
                disabled={submitting}
                label="School/Work"
                triggerId="chat-guest-School"
                labelClassName={FIELD_LABEL}
              >
                <SelectTrigger id="chat-guest-School" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOL_WORK.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                id="chat-guest-Age"
                name="Age"
                label="Age"
                value={guest.Age}
                placeholder="18"
                inputMode="numeric"
                maxLength={3}
                disabled={submitting}
                onChange={(event) =>
                  setGuest({ ...guest, Age: event.target.value })
                }
                error={
                  touched && badAge
                    ? `Age must be between ${MIN_AGE} and ${MAX_AGE}.`
                    : undefined
                }
                labelClassName={FIELD_LABEL}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SearchableSelect
                options={cities}
                value={guest.City}
                onChange={(value) =>
                  setGuest((current) =>
                    value === current.City
                      ? current
                      : { ...current, City: value, Barangay: "" },
                  )
                }
                placeholder="Select city"
                label="City"
                disabled={submitting}
                triggerId="chat-guest-City"
                labelClassName={FIELD_LABEL}
              />
              <SearchableSelect
                options={barangays}
                value={guest.Barangay}
                onChange={(value) =>
                  setGuest((current) => ({ ...current, Barangay: value }))
                }
                placeholder="Select barangay"
                label="Barangay"
                disabled={!guest.City || submitting}
                triggerId="chat-guest-Barangay"
                labelClassName={FIELD_LABEL}
              />
            </div>
          </div>
        )}

        <div>
          <Text
            as="div"
            id="chat-concern-label"
            className={cn("mb-2 block", FIELD_LABEL)}
          >
            What is it about?
          </Text>

          <div
            role="group"
            aria-labelledby="chat-concern-label"
            className="flex flex-wrap justify-center gap-2"
          >
            {CONCERNS.map(({ label, icon: Icon }) => {
              const active = concern === label;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={submitting}
                  onClick={() => setConcern(label)}
                  aria-pressed={active}
                  className={cn(
                    "flex h-[5.25rem] w-[calc((100%-1rem)/3)] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border px-1.5 text-center",
                    "transition-[background-color,border-color,box-shadow,translate,scale] duration-200 ease-out motion-reduce:transition-none",
                    "active:scale-[0.97]",
                    "outline-none focus-visible:ring-[3px] focus-visible:ring-[#128CF1]/40",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    active
                      ? "-translate-y-0.5 border-[#128CF1] bg-[#EAF4FE] shadow-[0_2px_8px_-2px_rgba(18,140,241,0.35)]"
                      : "border-gray-200 bg-white hover:border-[#128CF1]/50 hover:bg-gray-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      "transition-[background-color,color,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
                      active
                        ? "scale-110 bg-[#128CF1] text-white"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] leading-tight",
                      "transition-colors duration-200 ease-out motion-reduce:transition-none",
                      active
                        ? "font-[gothamMedium] text-[#0e6bb8]"
                        : "text-gray-600",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          id="chat-description"
          name="description"
          label="Your question"
          required
          value={description}
          rows={4}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Type your question..."
          disabled={submitting}
          error={
            touched && needsQuestion
              ? "Please tell us what you need."
              : undefined
          }
          labelClassName={FIELD_LABEL}
          className="resize-none text-sm"
          aria-invalid={touched && needsQuestion}
        />
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        <Button
          type="submit"
          variant={null}
          disabled={submitting}
          style={{ backgroundColor: submitting ? undefined : NAVY }}
          className="h-11 w-full gap-2 rounded-xl font-[gothamMedium] text-white shadow-[0_6px_16px_-6px_rgba(0,34,72,0.6)] transition hover:opacity-95 hover:no-underline disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Send className="size-4" />
              Start chat
            </>
          )}
        </Button>
        <Text
          as="div"
          className="mt-2 text-center text-[11px] leading-tight text-gray-400"
        >
          A librarian replies during library hours.
        </Text>
      </div>
    </form>
  );
}
