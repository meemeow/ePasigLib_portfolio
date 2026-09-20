import { db } from "../../../../core/firebase";
import { ClassCodeMaterialTypes, LibraryLocationsResponse, SectionsResponse } from "../fetching-types";
import { FirestoreData, list } from "./mappers";


export async function fetchClassCodeMaterialTypes(): Promise<ClassCodeMaterialTypes> {
  const snap = await db
    .collection("constants")
    .doc("classcode_materialtypes")
    .get();
  const data = (snap.data() || {}) as FirestoreData;
  return {
    classCodes: list(data.classCodes),
    materialTypes: list(data.materialTypes),
  };
}


export async function fetchLibraryLocations(): Promise<LibraryLocationsResponse> {
  const snap = await db
    .collection("constants")
    .doc("library_locations")
    .get();
  const data = (snap.data() || {}) as FirestoreData;
  return { libraryLocations: list(data.libraryLocations) };
}


export async function fetchSections(): Promise<SectionsResponse> {
  const snap = await db
    .collection("constants")
    .doc("sections")
    .get();
  const data = (snap.data() || {}) as FirestoreData;
  return { sections: list(data.sections) };
}
