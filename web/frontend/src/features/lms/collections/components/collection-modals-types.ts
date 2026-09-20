export interface BarcodeCopySelection {
  checked: boolean;
  quantity: number;
}

export type BarcodeSelectionMap = Record<
  string,
  Record<string, BarcodeCopySelection>
>;

export interface BarcodeGroup {
  accession: string;
  quantity: number;
}

export const PKC_LOCATION =
  "Pasig Knowledge Center (PKC)";

export const MAX_NAME_LENGTH = 80;

export type ConstantsType = "classCodes" | "materialTypes";

export type ConstantsListKey = ConstantsType | "libraryLocations" | "sections";

export type ConstantsPanelMode = "idle" | "add" | "edit" | "remove";

export interface ConstantsEditorState {
  mode: ConstantsPanelMode;
  drafts: string[];
  additions: string[];
  checked: Set<string>;
  error: string | null;
}

export const idleEditor: ConstantsEditorState = {
  mode: "idle",
  drafts: [],
  additions: [],
  checked: new Set<string>(),
  error: null,
};

export interface ConstantsRename {
  from: string;
  to: string;
}

export interface RemovalBlocker {
  value: string;
  blocking: Array<{ id: string; title: string; status?: string }>;
}

export interface RemovalAvailabilityResponse {
  blocked: RemovalBlocker[];
}

export interface ConstantsEditResponse {
  status?: string;
  success?: boolean;
  blocked?: RemovalBlocker[];
}

export interface ClassCodeMaterialTypesResponse {
  classCodes: string[];
  materialTypes: string[];
}

export interface LibraryLocationsResponse {
  libraryLocations: string[];
}

export interface SectionsResponse {
  sections: string[];
}

export interface PendingRemoval {
  type: ConstantsType;
  values: string[];
}

export interface ConstantsBanner {
  tone: "success" | "error";
  text: string;
}
