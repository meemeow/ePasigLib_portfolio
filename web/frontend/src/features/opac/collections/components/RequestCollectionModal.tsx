import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
	BookPlus,
	CheckCircle2,
	CloudOff,
	Library,
	Loader2,
	PencilLine,
	RefreshCcw,
	Search,
	X,
	XCircle,
	type LucideIcon,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { ModalShell } from "@/components/ui/ModalShell";
import { Text } from "@/components/ui/Text";
import { cn } from "@/lib/utils";
import { readCallableError } from "@/lib/api/callable-error";
import { defaultCollectionImage } from "@/lib/collection-cover";
import { clearCachedFetch } from "@/lib/fetching-data-cache";
import {
	EMPTY_QUOTA,
	fetchSuggestionQuota,
	searchGoogleBooksByTitle,
	type GoogleBooksVolume,
	type SuggestionQuota,
} from "@/features/opac/collections/api/collections";
import { callAddRecord as callable } from "@/lib/api/callables";

interface GoogleBook {
	id: string;
	title: string;
	author: string;
	publisher: string;
	description: string;
	image: string;
	infoLink: string;
	isbn10: string;
	isbn13: string;
}

type Banner = { tone: "success" | "error"; text: string };
type Mode = "search" | "manual";

const TABS: { key: Mode; label: string; icon: LucideIcon }[] = [
	{ key: "search", label: "Search Google Books", icon: Search },
	{ key: "manual", label: "Enter it myself", icon: PencilLine },
];

const ManualEntrySchema = z.object({
	title: z.string().trim().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
	author: z.string().trim().min(1, "Author is required").max(200, "Author must be 200 characters or less"),
	isbn: z
		.string()
		.trim()
		.refine(
			(value) => value === "" || [10, 13].includes(isbnDigits(value).length),
			"Enter a 10- or 13-digit ISBN, or leave it blank",
		),
});

function isbnDigits(value: string): string {
	return value.toUpperCase().replace(/[^0-9X]/g, "");
}

type ManualForm = z.infer<typeof ManualEntrySchema>;
type ManualErrors = Partial<Record<keyof ManualForm, string>>;

const EMPTY_FORM: ManualForm = {
	title: "",
	author: "",
	isbn: "",
};

const FALLBACK_COVER = defaultCollectionImage;

function searchFailureMessage(serverMessage?: string): string {
	const reason =
		serverMessage?.trim() || "Could not reach Google Books right now.";
	return `${reason} Use "Enter it myself" — a typed suggestion reaches the librarians exactly the same way.`;
}

function toGoogleBook(volume: GoogleBooksVolume): GoogleBook {
	return {
		id: volume.id,
		title: volume.title,
		author: volume.authors.join(", "),
		publisher: volume.publisher,
		description: volume.description,
		image: volume.thumbnail,
		infoLink: volume.infoLink,
		isbn10: volume.isbn10,
		isbn13: volume.isbn13,
	};
}

interface RequestBookModalProps {
	isOpen: boolean;
	onClose: () => void;
	onRequestSubmitted?: (quota: SuggestionQuota) => void;
}

export default function RequestCollectionModal({
	isOpen,
	onClose,
	onRequestSubmitted,
}: RequestBookModalProps) {
	const [mode, setMode] = useState<Mode>("search");
	const [quota, setQuota] = useState<SuggestionQuota>(EMPTY_QUOTA);
	const [banner, setBanner] = useState<Banner | null>(null);
	const [busy, setBusy] = useState(false);
	const [confirmed, setConfirmed] = useState(false);

	const [term, setTerm] = useState("");
	const [results, setResults] = useState<GoogleBook[]>([]);
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const [picked, setPicked] = useState<GoogleBook | null>(null);

	const [form, setForm] = useState<ManualForm>(EMPTY_FORM);
	const [errors, setErrors] = useState<ManualErrors>({});

	const seqRef = useRef(0);

	const loadQuota = useCallback(async () => {
		try {
			clearCachedFetch("suggestionQuota");
			setQuota(await fetchSuggestionQuota());
		} catch (error) {
			console.warn("Failed to read suggestion quota", error);
		}
	}, []);

	const handleRefresh = async (): Promise<void> => {
		if (refreshing) return;
		setRefreshing(true);
		try {
			await Promise.all([
				loadQuota(),
				new Promise((resolve) => setTimeout(resolve, 550)),
			]);
		} finally {
			setRefreshing(false);
		}
	};

	useEffect(() => {
		if (!isOpen) return;
		setMode("search");
		setBanner(null);
		setBusy(false);
		setConfirmed(false);
		setTerm("");
		setResults([]);
		setSearchError(null);
		setRefreshing(false);
		setPicked(null);
		setForm(EMPTY_FORM);
		setErrors({});
		void loadQuota();
	}, [isOpen, loadQuota]);

	useEffect(() => {
		const query = term.trim();
		if (!isOpen || mode !== "search" || picked || query.length < 2) {
			setResults([]);
			setSearching(false);
			setSearchError(null);
			return;
		}

		const seq = ++seqRef.current;
		setSearching(true);
		setSearchError(null);
		const timer = setTimeout(async () => {
			try {
				const data = await searchGoogleBooksByTitle(query);
				if (seq !== seqRef.current) return;
				setResults(data.results.map(toGoogleBook));
			} catch (error) {
				if (seq === seqRef.current) {
					setResults([]);
					setSearchError(searchFailureMessage(readCallableError(error).message));
				}
			} finally {
				if (seq === seqRef.current) setSearching(false);
			}
		}, 350);

		return () => clearTimeout(timer);
	}, [term, mode, picked, isOpen]);

	const validateManual = (next: ManualForm): boolean => {
		const parsed = ManualEntrySchema.safeParse(next);
		if (parsed.success) {
			setErrors({});
			return true;
		}
		const found: ManualErrors = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0] as keyof ManualForm | undefined;
			if (key && !found[key]) found[key] = issue.message;
		}
		setErrors(found);
		return false;
	};

	const setField = (key: keyof ManualForm, value: string): void => {
		setForm((prev) => ({ ...prev, [key]: value }));
		if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
	};

	const switchTab = (key: Mode): void => {
		setMode(key);
		setBanner(null);
		setErrors({});
	};

	const onTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
		const index = TABS.findIndex((entry) => entry.key === mode);
		if (index === -1) return;

		const next =
			event.key === "ArrowRight"
				? (index + 1) % TABS.length
				: event.key === "ArrowLeft"
					? (index - 1 + TABS.length) % TABS.length
					: event.key === "Home"
						? 0
						: event.key === "End"
							? TABS.length - 1
							: -1;
		if (next === -1) return;

		event.preventDefault();
		switchTab(TABS[next].key);
		document.getElementById(`suggest-tab-${TABS[next].key}`)?.focus();
	};

	const exhausted = quota.remaining <= 0;
	const ready = mode === "search" ? Boolean(picked) : form.title.trim().length > 0;
	const canSubmit = confirmed && ready && !busy && !exhausted;

	const submit = async (): Promise<void> => {
		if (!canSubmit) return;
		setBanner(null);

		let payload: Record<string, unknown>;
		if (mode === "search") {
			if (!picked) return;
			payload = {
				title: picked.title,
				author: picked.author,
				publisher: picked.publisher,
				description: picked.description,
				isbn10: picked.isbn10,
				isbn13: picked.isbn13,
				source: "GoogleBooks",
				googleBookId: picked.id,
				googleBookInfoLink: picked.infoLink,
				googleBookImage: picked.image,
			};
		} else {
			if (!validateManual(form)) return;
			const digits = isbnDigits(form.isbn);
			const { isbn: _typed, ...rest } = form;
			payload = {
				...rest,
				isbn10: digits.length === 10 ? digits : "",
				isbn13: digits.length === 13 ? digits : "",
				source: "Manual",
			};
		}

		setBusy(true);
		try {
						const res = await callable({ case: "addBookRequest", ...payload });
			const data = (res?.data || {}) as Partial<SuggestionQuota>;

			const next: SuggestionQuota = {
				...quota,
				limit: Number(data.limit ?? quota.limit),
				used: Number(data.used ?? quota.used + 1),
				remaining: Number(data.remaining ?? Math.max(0, quota.remaining - 1)),
			};
			setQuota(next);
			clearCachedFetch("suggestionQuota");

			setBanner({
				tone: "success",
				text: `Thank you. Your suggestion has been sent to the librarians${
					next.remaining > 0
						? ` — ${next.remaining} left this week.`
						: ", and that was your last one this week."
				}`,
			});

			setPicked(null);
			setTerm("");
			setResults([]);
			setForm(EMPTY_FORM);
			setErrors({});
			setConfirmed(false);
			onRequestSubmitted?.(next);
		} catch (error) {
			const { message } = readCallableError(error);
			setBanner({ tone: "error", text: message || "Failed to send your suggestion." });
			void loadQuota();
		} finally {
			setBusy(false);
		}
	};

	const dismiss = busy ? undefined : onClose;

	return (
		<ModalShell
			open={isOpen}
			title="Suggest a Book"
			description="Tell the librarians about a title you would like to see in the collection."
			icon={<BookPlus className="size-5" />}
			size="md"
			onClose={dismiss}
			bodyClassName="bg-gray-50"
			footerLeft={
				<div className="space-y-1.5">
					<Text as="label" className="flex cursor-pointer items-center gap-2">
						<Checkbox
							checked={confirmed}
							onCheckedChange={(value) => setConfirmed(value === true)}
							disabled={busy || exhausted}
						/>
						<Text className="text-xs text-gray-600">
							I confirm I want to submit this suggestion
						</Text>
					</Text>
					<Text
						className={cn(
							"text-xs",
							exhausted ? "text-red-600" : "text-gray-500",
						)}
					>
						{exhausted
							? `All ${quota.limit} suggestions used for the last ${quota.windowDays} days.`
							: `${quota.remaining} of ${quota.limit} suggestions left this week.`}
					</Text>
				</div>
			}
			actions={
				<>
					<Button variant="cancel" size="md" onClick={onClose} disabled={busy}>
						Close
					</Button>
					<Button
						size="md"
						onClick={submit}
						disabled={!canSubmit}
						className="bg-[#128CF1] text-white hover:bg-[#0e6bb8] hover:no-underline"
					>
						{busy ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Sending...
							</>
						) : (
							"Send Suggestion"
						)}
					</Button>
				</>
			}
		>
			<div className="sticky -top-5 z-10 -mx-6 -mt-5 mb-4 bg-gray-50 px-6 pt-5 sm:-mx-8 sm:px-8">
				<div className="flex items-end gap-2 border-b border-gray-200">
					<div
						role="tablist"
						aria-label="How to describe the book"
						onKeyDown={onTabKeyDown}
						className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
					>
						{TABS.map(({ key, label, icon: Icon }) => {
							const active = mode === key;
							return (
								<button
									key={key}
									type="button"
									role="tab"
									id={`suggest-tab-${key}`}
									aria-selected={active}
									aria-controls={`suggest-panel-${key}`}
									tabIndex={active ? 0 : -1}
									onClick={() => switchTab(key)}
									disabled={busy}
									className={cn(
										"-mb-px flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2.5 text-sm font-[gothamMedium] transition disabled:opacity-60 sm:px-4",
										active
											? "border-gray-200 bg-white text-[#128CF1]"
											: "border-transparent text-gray-500 hover:text-[#003067]",
									)}
								>
									<Icon className="size-4" />
									{label}
								</button>
							);
						})}
					</div>

					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={() => void handleRefresh()}
						disabled={busy || refreshing}
						aria-label="Refresh suggestion allowance"
						title="Refresh"
						className="mb-1.5 h-7 w-7 shrink-0 self-center"
					>
						<RefreshCcw
							className={cn(
								"size-3.5",
								refreshing && "animate-spin [animation-direction:reverse]",
							)}
						/>
					</Button>
				</div>
			</div>

			<div
				role="tabpanel"
				id={`suggest-panel-${mode}`}
				aria-labelledby={`suggest-tab-${mode}`}
				className="space-y-4"
			>
				{banner && (
					<div
						className={cn(
							"flex items-start gap-2 rounded-lg border p-3",
							banner.tone === "success"
								? "border-green-200 bg-green-50"
								: "border-red-200 bg-red-50",
						)}
					>
						{banner.tone === "success" ? (
							<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
						) : (
							<XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
						)}
						<Text
							className={cn(
								"text-sm",
								banner.tone === "success" ? "text-green-800" : "text-red-800",
							)}
						>
							{banner.text}
						</Text>
					</div>
				)}

				{quota.titles.length > 0 && (
					<div className="rounded-lg border border-gray-200 bg-white p-3">
						<Text className="text-xs font-[gothamMedium] text-[#003067]">
							Already suggested this week
						</Text>
						<Text className="mt-1 text-xs leading-relaxed text-gray-500">
							{quota.titles.join(" · ")}
						</Text>
					</div>
				)}

				{mode === "search" ? (
					<div className="space-y-3">
						<div className="relative">
							<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
							<Input
								value={term}
								onChange={(event) => {
									setTerm(event.target.value);
									setPicked(null);
								}}
								placeholder="Title, author, or ISBN"
								disabled={busy}
								autoComplete="off"
								className="pl-9"
							/>
							{searching && (
								<Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />
							)}
						</div>

						{picked ? (
							<div className="flex gap-3 rounded-lg border border-[#128CF1]/40 bg-[#128CF1]/5 p-3">
								<img
									src={picked.image || FALLBACK_COVER}
									alt=""
									onError={(event) => {
										event.currentTarget.src = FALLBACK_COVER;
									}}
									className="h-24 w-16 shrink-0 rounded border border-gray-200 object-cover"
								/>
								<div className="min-w-0 flex-1">
									<Text className="text-sm font-[gothamMedium] text-[#003067]">
										{picked.title}
									</Text>
									{picked.author && (
										<Text className="mt-0.5 text-xs text-gray-600">
											{picked.author}
										</Text>
									)}
									<Text className="mt-0.5 text-xs text-gray-500">
										{[picked.publisher, picked.isbn13 || picked.isbn10]
											.filter(Boolean)
											.join(" · ")}
									</Text>
									{picked.infoLink && (
										<a
											href={picked.infoLink}
											target="_blank"
											rel="noopener noreferrer"
											className="mt-1 inline-block text-xs text-[#128CF1] hover:underline"
										>
											View on Google Books
										</a>
									)}
								</div>
								<button
									type="button"
									onClick={() => setPicked(null)}
									disabled={busy}
									aria-label="Clear selection"
									className="h-fit shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-white hover:text-gray-600"
								>
									<X className="size-4" />
								</button>
							</div>
						) : results.length > 0 ? (
							<ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white">
								{results.map((book) => (
									<li key={book.id}>
										<button
											type="button"
											onClick={() => {
												setPicked(book);
												setTerm(book.title);
												setResults([]);
											}}
											disabled={busy}
											className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-gray-50"
										>
											<img
												src={book.image || FALLBACK_COVER}
												alt=""
												loading="lazy"
												onError={(event) => {
													event.currentTarget.src = FALLBACK_COVER;
												}}
												className="h-14 w-10 shrink-0 rounded border border-gray-200 object-cover"
											/>
											<span className="min-w-0 flex-1">
												<Text className="truncate text-sm font-[gothamMedium] text-[#003067]">
													{book.title}
												</Text>
												<Text className="truncate text-xs text-gray-500">
													{[book.author, book.publisher]
														.filter(Boolean)
														.join(" · ") || "Unknown author"}
												</Text>
											</span>
										</button>
									</li>
								))}
							</ul>
						) : searchError && !searching ? (
							<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-4 py-10 text-center">
								<CloudOff className="size-7 text-amber-500" strokeWidth={1.5} />
								<Text className="max-w-sm text-xs text-amber-800">
									{searchError}
								</Text>
								<Button
									variant="outline"
									size="sm"
									onClick={() => switchTab("manual")}
									className="mt-1 text-xs"
								>
									Enter it myself
								</Button>
							</div>
						) : (
							<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
								<Library className="size-7 text-gray-300" strokeWidth={1.5} />
								<Text className="text-xs text-gray-500">
									{term.trim().length < 2
										? "Type at least two characters to search Google Books."
										: searching
											? "Searching..."
											: `Nothing found for "${term.trim()}". Try "Enter it myself".`}
								</Text>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-3">
						<Input
							label="Book Title"
							required
							labelClassName="text-[#003067] font-[gothamMedium]"
							value={form.title}
							onChange={(event) => setField("title", event.target.value)}
							error={errors.title}
							maxLength={100}
							disabled={busy}
							placeholder="The title as printed on the cover"
						/>
						<Input
							label="Author"
							required
							labelClassName="text-[#003067] font-[gothamMedium]"
							value={form.author}
							onChange={(event) => setField("author", event.target.value)}
							error={errors.author}
							maxLength={200}
							disabled={busy}
							placeholder="Surname, First name"
						/>
						<Input
							label="ISBN"
							labelClassName="text-[#003067] font-[gothamMedium]"
							value={form.isbn}
							onChange={(event) => setField("isbn", event.target.value)}
							error={errors.isbn}
							maxLength={20}
							disabled={busy}
							inputMode="numeric"
							placeholder="Optional — 10 or 13 digits, from the copyright page"
						/>
					</div>
				)}
			</div>
		</ModalShell>
	);
}
