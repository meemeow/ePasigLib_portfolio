import { clearCachedFetch } from "@/lib/fetching-data-cache";
import { callAddRecord as addRecord } from "@/lib/api/callables";
import { friendlyMessageFor as messageFor } from "@/lib/api/callable-result";


export interface ClosureResult {
  success: boolean;
  date: string;
  reason: string;
  loansExtended: number;
  patronsNotified: number;
  alreadyClosed: boolean;
}


export async function declareLibraryClosure(
  reason: string,
): Promise<ClosureResult> {
  try {
    const response = await addRecord({
      case: "declareLibraryClosure",
      reason,
    });
    clearCachedFetch("libraryCalendar");
    return (response?.data || {}) as ClosureResult;
  } catch (error) {
    throw new Error(messageFor(error, "Could not close the library."));
  }
}
