import { requireStaffActor } from "../../core/guards";
import type { UpdateStatus } from "./crud-updates-types";

// Shared primitives, re-exported so desk modules keep one import for the
// vocabulary they work in.
export { now, serverTimestamp } from "../../core/firebase";
export { optionalString, requireString } from "../../core/coerce";
export { toMillisLoose as toMillis } from "../../core/time";

export const UPDATES_PERMISSION = "AnnouncementCreation";

export interface UpdatesActor {
  authUid: string;
  staffUID: string;
  staffName: string;
}

export async function requireUpdatesActor(
  authUid: string | null,
): Promise<UpdatesActor> {
  const actor = await requireStaffActor(authUid ?? undefined, UPDATES_PERMISSION);
  return {
    authUid: actor.authUid,
    staffUID: actor.publicUID || actor.authUid,
    staffName: actor.fullName || actor.publicUID || actor.authUid,
  };
}

export function normalizeStatus(value: unknown): UpdateStatus {
  const raw = String(value ?? "").trim();
  if (raw === "Draft" || raw === "Archived" || raw === "Published") return raw;
  return "Published";
}

/** One lowercase haystack for the substring search the desk tables run. */
export function buildSearchText(...parts: Array<string | string[]>): string {
  return parts
    .flat()
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Attachments, narrowed to the {URL, Name} pairs the desk records store. */
export function sanitizeFiles(
  value: unknown,
): Array<{ URL: string; Name: string }> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const file = (entry ?? {}) as Record<string, unknown>;
      return {
        URL: String(file.URL ?? file.url ?? "").trim(),
        Name: String(file.Name ?? file.name ?? "").trim(),
      };
    })
    .filter((file) => !!file.URL);
}
