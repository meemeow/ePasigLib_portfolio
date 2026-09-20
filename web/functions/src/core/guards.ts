import { db } from "./firebase";
import { forbidden, unauthenticated } from "./errors";

export interface StaffActor {
  authUid: string;
  publicUID: string;
  staffCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

/**
 * Resolve the signed-in staff member and confirm they hold `permission` —
 * any one of them when given a list. Pass an empty list to require only that
 * the caller is active staff.
 */
export async function requireStaffActor(
  authUid: string | undefined,
  permission: string | string[],
): Promise<StaffActor> {
  if (!authUid) {
    throw unauthenticated("You must be signed in to do this.");
  }

  const staffSnap = await db.collection("staffs").doc(authUid).get();
  if (!staffSnap.exists) {
    throw forbidden("Only staff can perform this action.");
  }

  const staff = staffSnap.data() as Record<string, any>;
  if (staff.Status === "Archived") {
    throw forbidden("This staff account is archived.");
  }

  const needed = Array.isArray(permission) ? permission : [permission];
  if (needed.length > 0 && !needed.some((flag) => staff[flag] === true)) {
    throw forbidden(
      needed.length === 1
        ? `You do not have the "${needed[0]}" permission.`
        : `You need one of these permissions: ${needed.join(", ")}.`,
    );
  }

  const firstName = String(staff.FirstName || "");
  const lastName = String(staff.LastName || "");

  return {
    authUid,
    publicUID: String(staff.UID || ""),
    staffCode: String(staff.StaffCode || ""),
    fullName: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    avatar: String(staff.Avatar || ""),
  };
}

/** The caller may only act on their own record. */
export function requireSelf(authUid: string | null | undefined, uid: string): string {
  if (!authUid || authUid !== uid) throw unauthenticated();
  return uid;
}
