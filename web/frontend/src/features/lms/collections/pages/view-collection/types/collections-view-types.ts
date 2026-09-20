export type EpochMillis = number | null;

export type CopyAvailability =
  | "Available"
  | "Archived"
  | "Reserved"
  | "Borrowed";

export interface PkcCopy {
    Accession: string;
    LibraryLocation: string;
    Section: string;
    CreatedBy: string;
    CreatedOn: EpochMillis;
    LastModifiedBy: string;
    ModifiedOn: EpochMillis;
    LastBorrowedBy: string;
    LastBorrowedDate: EpochMillis;
    ForLibraryUse: boolean;
    Availability: CopyAvailability | string;
}

export interface OtherLibraryCopy {
    CallNumber: string;
    LibraryLocation: string;
    CreatedBy: string;
    CreatedOn: EpochMillis;
    ModifiedBy: string;
    ModifiedOn: EpochMillis;
    CopiesAvailable: number;
    Availability: CopyAvailability | string;
}

export interface OtherLibraryCopyDraft {
    callNumber: string;
    libraryLocation: string;
    copies: string;
}

export const emptyOtherLibraryCopyDraft = (): OtherLibraryCopyDraft => ({
    callNumber: "",
    libraryLocation: "",
    copies: "",
});

export interface CollectionData {
    id: string;
    UID?: string;
    CollectionTitle: string;
    SecondTitle?: string;
    Edition?: string;
    Volume?: string;
    TitleDescription?: string;
    Description?: string;
    MainAuthor?: string;
    JointAuthor?: string;
    Author?: string;
    RelatedNames?: string[];
    ClassCode?: string;
    CallNumber?: string;
    CuttersTable?: string;
    Subjects?: string[];
    Publisher?: string;
    PublicationPlace?: string;
    PublicationYear?: string;
    SeriesTitle?: string;
    GeneralNote?: string;
    CopyrightYear?: string;
    Size?: string;
    IncludesSummary?: string;
    ISBN10?: string;
    ISBN13?: string;
    MaterialType?: string;
    PageCount?: string;
    CollectionImage?: string;
    Tags?: string[];
    Status?: string;
    Copies?: PkcCopy[];
    OtherCopies?: OtherLibraryCopy[];
    Acquisition?: string;
    Donor?: string;
    Inclusion?: string;
    PrePage?: string;
    DateReceived?: string;
    CostPrice?: string;
}

export type CollectionViewTab =
    | "home"
    | "marc"
    | "modification_logs"
    | "checkout_history"
    | "checkin_history";

export interface ModificationLog {
    id?: string;
    Action: string;
    TargetName: string;
    Description: string;
    By: string;
    On: EpochMillis;
}

export interface CheckoutHistory {
    id?: string;
    Accession: string;
    FullName: string;
    CheckedOutBy: string;
    CheckoutDate: EpochMillis;
    DueDate: EpochMillis;
    ReturnStatus: string;
}

export interface CheckinHistory {
    id?: string;
    Accession: string;
    FullName: string;
    CheckedInBy: string;
    CheckInDate: EpochMillis;
    Violations: string;
}

export interface CollectionLogs {
    modificationLogs: ModificationLog[];
    checkoutHistory: CheckoutHistory[];
    checkinHistory: CheckinHistory[];
}

export interface CopyMutationResult {
    success?: boolean;
    message?: string;
}

