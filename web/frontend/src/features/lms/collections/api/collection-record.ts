import { cachedFetch } from "@/lib/fetching-data-cache";
import type { CollectionRecord } from "@/features/lms/collections/pages/edit-collection/types/collections-edit-types";

export async function fetchCollectionById(
  collectionId: string,
  force = false,
): Promise<CollectionRecord | null> {
  const id = String(collectionId || "").trim();
  if (!id) return null;

  try {
    return await cachedFetch<CollectionRecord | null>(
      "collectionById",
      { id },
      { force },
    );
  } catch (err) {
    console.error("Error fetching collection:", err);
    throw err;
  }
}
