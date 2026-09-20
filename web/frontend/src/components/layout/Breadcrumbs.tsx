import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { useBreadcrumbLabel } from "@/hooks/breadcrumb-label";
import { useAppSection } from "@/hooks/use-app-section";

interface NamedRecord {
    FirstName?: string;
    LastName?: string;
}

interface BookByIdResponse {
    book?: { CollectionTitle?: string } | null;
}

interface UpdateByIdResponse {
    Subject?: string;
    Title?: string;
}

const DISPLAY_OVERRIDES: Record<string, string> = {
    news_announcements: "Updates",
    verifyIDs: "Verify Patrons",
    "check-in": "Check In",
    "check-out": "Check Out",
    "checkin-history": "Check In History",
    "checkout-history": "Check Out History",
    "reservation-history": "Reservation History",
    "renewal-history": "Renewal History",
    "reservation-approval": "Reservation Approval",
    "library-desk": "Library Desk",
    "book-requests": "Book Requests",
    "reference-desk": "Reference Desk",
};

const titleise = (segment: string) =>
    segment.charAt(0).toUpperCase() + segment.slice(1);

async function fetchBookTitle(id: string): Promise<string | null> {
    const result = await cachedFetch<BookByIdResponse | null>("fetchBookById", {
        id,
    });
    return result?.book?.CollectionTitle || null;
}

async function fetchUpdateTitle(id: string): Promise<string | null> {
    const record = await cachedFetch<UpdateByIdResponse | null>("updateById", {
        id,
    });
    return record?.Subject?.trim() || record?.Title?.trim() || null;
}

async function fetchDetailLabel(
    section: string,
    action: string,
    id: string,
): Promise<string | null> {
    if (section === "staffs" && action === "view") {
        const staff = await cachedFetch<NamedRecord | null>("staffById", { id });
        if (!staff) return null;
        return `${staff.FirstName || ""} ${staff.LastName || ""}`.trim() || null;
    }

    if (section === "patrons" && action === "view") {
        const patron = await cachedFetch<NamedRecord | null>("patronById", { id });
        if (!patron) return null;
        return `${patron.FirstName || ""} ${patron.LastName || ""}`.trim() || null;
    }

    if (section === "collections" && (action === "view" || action === "edit")) {
        return await fetchBookTitle(id);
    }

    return null;
}

export default function Breadcrumbs() {
    const { base, pathname } = useAppSection();

    const segments = useMemo(
        () => pathname.replace(base, "").split("/").filter(Boolean),
        [pathname, base],
    );

    const [fetchedLabel, setFetchedLabel] = useState<string | null>(null);
    const published = useBreadcrumbLabel();
    const detailLabel = published ?? fetchedLabel;
    const setDetailLabel = setFetchedLabel;

    const [section, action, id] = segments;
    const isDetailRoute = segments.length === 3 && !!id;

    const isCollectionRoute =
        segments.length === 2 && section === "collections" && !!action;

    const DESK_DETAIL_SECTIONS = ["announcements", "news", "conversations"];
    const isDeskDetailRoute =
        segments.length === 4 &&
        segments[0] === "library-desk" &&
        DESK_DETAIL_SECTIONS.includes(segments[1]) &&
        segments[2] === "view";
    const deskId =
        isDeskDetailRoute && segments[1] !== "conversations" ? segments[3] : "";

    useEffect(() => {
        if (!isDetailRoute && !isCollectionRoute && !isDeskDetailRoute) {
            setDetailLabel(null);
            return;
        }

        setDetailLabel(null);

        if (isDeskDetailRoute && !deskId) return;

        let ignore = false;
        const pending = isDeskDetailRoute
            ? fetchUpdateTitle(deskId)
            : isCollectionRoute
              ? fetchBookTitle(action)
              : fetchDetailLabel(section, action, id);

        pending
            .then((label) => {
                if (!ignore) setDetailLabel(label);
            })
            .catch((error) => {
                console.warn("Failed to resolve breadcrumb label:", error);
            });

        return () => {
            ignore = true;
        };
    }, [isDetailRoute, isCollectionRoute, isDeskDetailRoute, deskId, section, action, id]);

    const isHomeRoute =
        segments.length === 0 || (segments.length === 1 && segments[0] === "home");

    const crumbs: Array<{ key: string; label: string; to: string }> = [];

    if (isHomeRoute) {
        crumbs.push({ key: "home", label: "Home", to: `${base}/home` });
    } else {
        segments.forEach((segment, index) => {
            const to = `${base}/${segments.slice(0, index + 1).join("/")}`;

            if (isCollectionRoute && index === 1) {
                crumbs.push({
                    key: `${segment}-${index}`,
                    label: detailLabel || "Book",
                    to,
                });
                return;
            }

            if (isDeskDetailRoute) {
                if (index === 3) return;
                if (index === 2) {
                    crumbs.push({
                        key: `${segment}-${index}`,
                        label: detailLabel ? `View ${detailLabel}` : "View",
                        to: `${base}/${segments.join("/")}`,
                    });
                    return;
                }
            }

            if (isDetailRoute) {
                if (section === "collections") {
                    if (index === 2) return;
                    if (index === 1) {
                        crumbs.push({
                            key: `${segment}-${index}`,
                            label: detailLabel
                                ? `${titleise(segment)} ${detailLabel}`
                                : titleise(segment),
                            to: `${base}/${section}/${segment}/${id}`,
                        });
                        return;
                    }
                } else if (section === "staffs" || section === "patrons") {
                    if (index === 1) return;
                    if (index === 2) {
                        crumbs.push({
                            key: `${segment}-${index}`,
                            label: detailLabel ? `View ${detailLabel}` : "View",
                            to,
                        });
                        return;
                    }
                }
            }

            let label = DISPLAY_OVERRIDES[segment] ?? titleise(segment);
            if (segment === "register" && section === "staffs")
                label = "Add a Librarian";
            if (segment === "register" && section === "patrons")
                label = "Add a Patron";

            crumbs.push({ key: `${segment}-${index}`, label, to });
        });
    }

    return (
        <div className="font-[gothamLight] w-full h-10 px-6 sm:px-8 md:px-8 xl:px-12 py-2 text-sm bg-[#002248] text-white flex items-center">
            <div className="max-w-screen flex items-center space-x-2">
                {crumbs.map(
                    (crumb, index): ReactNode => (
                        <span key={crumb.key} className="flex items-center space-x-2">
                            {index > 0 && <span>/</span>}
                            <Link to={crumb.to} className="hover:underline">
                                {crumb.label}
                            </Link>
                        </span>
                    ),
                )}
            </div>
        </div>
    );
}
