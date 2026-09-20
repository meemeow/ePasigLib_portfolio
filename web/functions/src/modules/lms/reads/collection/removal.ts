import { db } from "../../../../core/firebase";
import { RemovalAvailabilityResponse, RemovalBlocker, RemovalTarget } from "../fetching-types";
import { FirestoreData, text } from "./mappers";


const REMOVAL_SOURCE: Record<
  RemovalTarget,
  | { kind: "field"; field: string }
  | { kind: "copies"; arrays: string[]; property: string }
> = {
  classCodes: { kind: "field", field: "ClassCode" },
  materialTypes: { kind: "field", field: "MaterialType" },
  libraryLocations: {
    kind: "copies",
    arrays: ["Copies", "OtherCopies"],
    property: "LibraryLocation",
  },
  sections: { kind: "copies", arrays: ["Copies"], property: "Section" },
};


async function blockersOnField(
  field: string,
  values: string[],
): Promise<RemovalBlocker[]> {
  const collections = db.collection("collections");

  const snapshots = await Promise.all(
    values.map((value) =>
      collections
        .where(field, "==", value)
        .where("Status", "==", "Available")
        .get(),
    ),
  );

  const blocked: RemovalBlocker[] = [];
  snapshots.forEach((snap, index) => {
    if (snap.empty) return;
    blocked.push({
      value: values[index],
      blocking: snap.docs.map((doc) => ({
        id: doc.id,
        title: text((doc.data() as FirestoreData).CollectionTitle),
      })),
    });
  });

  return blocked;
}


async function blockersInCopies(
  arrays: string[],
  property: string,
  values: string[],
): Promise<RemovalBlocker[]> {
  const wanted = new Set(values.map((value) => text(value).trim()));
  const snap = await db.collection("collections").get();
  const blocked = new Map<string, RemovalBlocker>();

  for (const doc of snap.docs) {
    const record = doc.data() as FirestoreData;
    if (text(record.Status) !== "Available") continue;

    const used = new Set<string>();
    for (const arrayField of arrays) {
      const copies = Array.isArray(record[arrayField])
        ? (record[arrayField] as FirestoreData[])
        : [];
      for (const copy of copies) {
        const current = text(copy?.[property]).trim();
        if (current && wanted.has(current)) used.add(current);
      }
    }

    for (const value of used) {
      const entry = blocked.get(value) || { value, blocking: [] };
      entry.blocking.push({
        id: doc.id,
        title: text(record.CollectionTitle),
      });
      blocked.set(value, entry);
    }
  }

  return values
    .map((value) => blocked.get(text(value).trim()))
    .filter((entry): entry is RemovalBlocker => !!entry);
}


export async function checkRemovalAvailability(
  type: RemovalTarget,
  values: string[],
): Promise<RemovalAvailabilityResponse> {
  if (values.length === 0) return { blocked: [] };

  const source = REMOVAL_SOURCE[type];
  const blocked =
    source.kind === "field"
      ? await blockersOnField(source.field, values)
      : await blockersInCopies(source.arrays, source.property, values);

  return { blocked };
}
