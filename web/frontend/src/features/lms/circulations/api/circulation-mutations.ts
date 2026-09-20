import { invalidateCirculationCaches } from "@/features/lms/circulations/circulations-cache";
import { invalidateCollectionCaches } from "@/features/lms/collections/collection-cache";
import { invalidatePatronCaches } from "@/features/lms/patrons/pages/index/api/patrons-cache";
import type {
  CheckinPayload,
  CheckoutPayload,
  RenewalPayload,
} from "@/features/lms/circulations/types/circulation-transaction-types";
import { callCirculation as call } from "@/lib/api/callables";
import { messageFor, unwrap } from "@/lib/api/callable-result";


function invalidateAll(options?: { collections?: boolean; patrons?: boolean }) {
  invalidateCirculationCaches();
  if (options?.collections !== false) invalidateCollectionCaches();
  if (options?.patrons !== false) invalidatePatronCaches();
}



export async function circulationCheckout(payload: CheckoutPayload) {
  try {
    const res = await call({ case: "checkout", ...payload });
    const data = unwrap<{ ok?: boolean; trnsId?: string }>(res?.data);
    if (!data.ok) throw new Error("Checkout failed.");
    invalidateAll();
    return data;
  } catch (error) {
    throw new Error(messageFor(error, "Checkout failed."));
  }
}

export async function circulationCheckin(payload: CheckinPayload) {
  try {
    const res = await call({ case: "checkin", ...payload });
    const data = unwrap<{ ok?: boolean; trnsId?: string }>(res?.data);
    if (!data.ok) throw new Error("Check in failed.");
    invalidateAll();
    return data;
  } catch (error) {
    throw new Error(messageFor(error, "Check in failed."));
  }
}

export async function approveRenewal(payload: RenewalPayload) {
  try {
    const res = await call({ case: "renewalApprove", ...payload });
    const data = unwrap<{ ok?: boolean }>(res?.data);
    if (!data.ok) throw new Error("Failed to approve renewal.");
    invalidateAll({ collections: false });
    return data;
  } catch (error) {
    throw new Error(messageFor(error, "Failed to approve renewal."));
  }
}

export async function reservationAction(
  docId: string,
  action: "approve" | "reject",
  remarks = "",
) {
  try {
    const res = await call({
      case: "reservationAction",
      docId,
      action,
      remarks,
    });
    const data = unwrap<{
      ok?: boolean;
      error?: string;
      pickupFrom?: number | null;
      shelfExpiresOn?: number | null;
    }>(res?.data);
    if (!data.ok) {
      throw new Error(data.error || `Failed to ${action} reservation.`);
    }
    invalidateAll();
    return data;
  } catch (error) {
    throw new Error(messageFor(error, `Failed to ${action} reservation.`));
  }
}
