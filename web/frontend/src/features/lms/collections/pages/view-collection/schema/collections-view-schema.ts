import { z } from "zod";

export const AddCopySchema = z.object({
    accession: z.string().min(1, "Accession is required"),
    libraryLocation: z.string().min(1, "Library location is required"),
    section: z.string().optional(),
    forLibraryUse: z.boolean(),
    collectionUID: z.string().min(1, "Collection UID is required"),
    collectionTitle: z.string().min(1, "Collection title is required"),
});

export const EditCopySchema = z.object({
    accession: z.string().min(1, "Accession is required"),
    libraryLocation: z.string().min(1, "Library location is required"),
    section: z.string().optional(),
    forLibraryUse: z.boolean(),
    collectionUID: z.string().min(1, "Collection UID is required"),
    collectionTitle: z.string().min(1, "Collection title is required"),
    copyIndex: z.number().min(0, "Copy index is required"),
});

export const ArchiveCopySchema = z.object({
    accession: z.string().min(1, "Accession is required"),
    collectionUID: z.string().min(1, "Collection UID is required"),
    collectionTitle: z.string().min(1, "Collection title is required"),
    copyIndex: z.number().min(0, "Copy index is required"),
    action: z.enum(['archive', 'unarchive']),
});

export const AddOtherCopySchema = z.object({
    callNumber: z.string().min(1, "Call number is required"),
    libraryLocation: z.string().min(1, "Library location is required"),
    copiesAvailable: z.number().min(1, "At least 1 copy is required"),
    collectionUID: z.string().min(1, "Collection UID is required"),
    collectionTitle: z.string().min(1, "Collection title is required"),
});

export const EditOtherCopySchema = z.object({
    callNumber: z.string().min(1, "Call number is required"),
    libraryLocation: z.string().min(1, "Library location is required"),
    copiesAvailable: z.number().min(1, "At least 1 copy is required"),
    collectionUID: z.string().min(1, "Collection UID is required"),
    collectionTitle: z.string().min(1, "Collection title is required"),
    copyIndex: z.number().min(0, "Copy index is required"),
});

export const ArchiveOtherCopySchema = z.object({
    callNumber: z.string().min(1, "Call number is required"),
    collectionUID: z.string().min(1, "Collection UID is required"),
    collectionTitle: z.string().min(1, "Collection title is required"),
    copyIndex: z.number().min(0, "Copy index is required"),
    action: z.enum(['archive', 'unarchive']),
});

export const MARCFormSchema = z.object({
    ISBN: z.string().optional(),
    ClassCode: z.string().optional(),
    ClassCodeB: z.string().optional(),
    CallNumber: z.string().optional(),
    CuttersTable: z.string().optional(),
    CopyrightYear: z.string().optional(),
    MainAuthor: z.string().optional(),
    CollectionTitle: z.string().optional(),
    SecondTitle: z.string().optional(),
    Edition: z.string().optional(),
    PublicationPlace: z.string().optional(),
    Publisher: z.string().optional(),
    PageCount: z.string().optional(),
    MaterialType: z.string().optional(),
    Size: z.string().optional(),
    Volume: z.string().optional(),
    IncludesSummary: z.string().optional(),
    Accession: z.string().optional(),
});