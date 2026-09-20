export type ConstantsAction = "add" | "edit" | "remove";

export type ConstantsType = "classCodes" | "materialTypes";

export type CopyArrayField = "Copies" | "OtherCopies";

export type CopyProperty = "LibraryLocation" | "Section";

export interface ConstantsRename {
  from: string;
  to: string;
}

export interface ConstantsBlocker {
  value: string;
  blocking: Array<{ id: string; title: string; status: string }>;
}

export interface PendingRewrite {
  id: string;
  kind: "field" | "copies";
  field?: "ClassCode" | "MaterialType";
  arrays?: CopyArrayField[];
  property?: CopyProperty;
  from: string;
  to: string;
  startedOn: string;
}

export interface ConstantsRequest {
  action?: string;
  type?: string;
  items?: unknown;
  changes?: unknown;
  remove?: unknown;
  staffUID?: string;
  staffName?: string;
}

export interface ConstantsResult {
  status: "updated" | "blocked";
  case: string;
  success: boolean;
  blocked?: ConstantsBlocker[];
}

export interface CollectionCopyDoc {
  Accession?: string;
  LibraryLocation?: string;
  Section?: string;
  [key: string]: unknown;
}

export interface CollectionDoc {
  CollectionTitle?: string;
  Status?: string;
  ClassCode?: string;
  MaterialType?: string;
  Copies?: unknown;
  OtherCopies?: unknown;
}
