import { z } from "zod";
import { CollectionFormData, RegisterConstants } from "@/features/lms/collections/pages/register-collection/types/collections-register-types";

const titleRegex = /^[A-Za-z0-9\s.,:;!?'"()\/\-]+$/;
const authorNameRegex = /^[\p{L}\s.'(),-]+$/u;
const callNumberRegex = /^(?=.*[A-Za-z0-9])[A-Za-z0-9./\-\s]+$/;
const alphanumeric = /^[A-Za-z0-9\s]+$/;
const publisherRegex = /^[A-Za-z0-9\s.,&'()\-:]+$/;
const sizeRegex = /^[0-9\s.xXcminCMIN\-]+$/;
const isbn10Pattern = /^[0-9]{9}[0-9X]$/;
const isbn13Pattern = /^[0-9]{13}$/;
const editionRegex = /^[A-Za-z0-9\s\-().]*$/;
const volumeRegex = /^[A-Za-z0-9\s.\-]+$/;
const prepageRegex = /^[0-9ivxlcdmIVXLCDM\s.\-]+$/;
const pageCountFlexibleRegex = /^(p\.?\s*)?\d+(\s*(pages?|pgs?|pg|page))?$/i;

export const collectionRegisterSchema = z.object({
	CollectionTitle: z.string().min(1, "Collection Title is required").regex(titleRegex, "Invalid Collection Title"),
	SecondTitle: z.string().optional().or(z.literal("")),
	TitleDescription: z.string().optional().or(z.literal("")),
	MainAuthor: z.string().min(1, "Main Author is required").regex(authorNameRegex, "Invalid Main Author"),
	JointAuthor: z.string().optional().or(z.literal("")),
	Author: z.string().optional().or(z.literal("")),
	Description: z.string().optional().or(z.literal("")),
	ClassCode: z.string().min(1, "Class Code is required"),
	CallNumber: z.union([z.string().regex(callNumberRegex, "Invalid Call Number"), z.literal("")]).optional(),
	CuttersTable: z.union([z.string().regex(alphanumeric, "Invalid Cutters Table"), z.literal("")]).optional(),
	Subjects: z.union([z.string(), z.array(z.string())]),
	Publisher: z.union([z.string().regex(publisherRegex, "Invalid Publisher"), z.literal("")]).optional(),
	PublicationPlace: z.string().optional().or(z.literal("")),
	PublicationYear: z.string().optional().or(z.literal("")),
	SeriesTitle: z.string().optional().or(z.literal("")),
	GeneralNote: z.string().optional().or(z.literal("")),
	CopyrightYear: z.union([z.string().regex(/^c\d{4}$/i, "Invalid Copyright Year"), z.literal("")]).optional(),
	Size: z.union([z.string().regex(sizeRegex, "Invalid Size"), z.literal("")]).optional(),
	Inclusion: z.string().optional().or(z.literal("")),
	DateReceived: z.string().optional().or(z.literal("")),
	Acquisition: z.string().optional().or(z.literal("")),
	CostPrice: z.string().optional().or(z.literal("")),
	Donor: z.string().optional().or(z.literal("")),
	ISBN13: z.union([z.string().regex(isbn13Pattern, "Invalid ISBN-13"), z.literal("")]).optional(),
	ISBN10: z.union([z.string().regex(isbn10Pattern, "Invalid ISBN-10"), z.literal("")]).optional(),
	Edition: z.union([z.string().regex(editionRegex, "Invalid Edition"), z.literal("")]).optional(),
	Volume: z.union([z.string().regex(volumeRegex, "Invalid Volume"), z.literal("")]).optional(),
	MaterialType: z.string().min(1, "Material Type is required"),
	PageCount: z.union([z.string().regex(pageCountFlexibleRegex, "Invalid Page Count"), z.literal("")]).optional(),
	PrePage: z.union([z.string().regex(prepageRegex, "Invalid Preliminary Page"), z.literal("")]).optional(),
	CollectionImage: z.string().url().or(z.string()),
	RelatedNames: z.array(z.string()).optional(),
});

export function validateFormData(data: CollectionFormData, constants: RegisterConstants): string | null {
	const base = collectionRegisterSchema.safeParse(data);
	if (!base.success) {
		return base.error.errors[0]?.message || "Invalid data";
	}
	if (data.ClassCode && !constants.classCodes.includes(data.ClassCode)) {
		return `Class Code must be one of: ${constants.classCodes.join(", ")}`;
	}
	if (data.MaterialType && !constants.materialTypes.includes(data.MaterialType)) {
		return `Material Type must be one of: ${constants.materialTypes.join(", ")}`;
	}
	if (Array.isArray(data.Subjects)) {
		for (const subject of data.Subjects) {
			if (!titleRegex.test(subject)) return "Invalid Subject";
		}
	}
	if (Array.isArray(data.RelatedNames)) {
		for (const name of data.RelatedNames) {
			if (!authorNameRegex.test(name)) return "Invalid Related Name";
		}
	}
	return null;
}

export function getFieldErrors(data: CollectionFormData, constants?: RegisterConstants): Record<string, string> {
	const issues: Record<string, string> = {};
	const parsed = collectionRegisterSchema.safeParse(data);
	if (!parsed.success) {
		for (const err of parsed.error.errors) {
			const pathKey = err.path?.[0];
			if (typeof pathKey === "string" && !issues[pathKey]) {
				issues[pathKey] = err.message;
			}
		}
	}
	if (constants) {
		if (data.ClassCode && !constants.classCodes.includes(data.ClassCode)) {
			issues.ClassCode = `Class Code must be one of: ${constants.classCodes.join(", ")}`;
		}
		if (data.MaterialType && !constants.materialTypes.includes(data.MaterialType)) {
			issues.MaterialType = `Material Type must be one of: ${constants.materialTypes.join(", ")}`;
		}
		if (Array.isArray(data.Subjects)) {
			const titleRegex = /^[A-Za-z0-9\s.,:;!?'"()\/\-]+$/;
			for (const subject of data.Subjects) {
				if (!titleRegex.test(subject)) {
					issues.Subjects = "Invalid Subject";
					break;
				}
			}
		}
		if (Array.isArray(data.RelatedNames)) {
			const authorNameRegex = /^[\p{L}\s.'(),-]+$/u;
			for (const name of data.RelatedNames) {
				if (!authorNameRegex.test(name)) {
					issues.RelatedNames = "Invalid Related Name";
					break;
				}
			}
		}
	}
	return issues;
}

