import { z } from "zod";

export const patronSearchSchema = z
  .string()
  .trim()
  .min(1, "Search is required");
export const barcodeSchema = z.string().trim().min(1, "Barcode is required");
export const dateISOyyyyMMdd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)");

export const checkoutSchema = z.object({
  patronIdOrUID: z.string().trim().min(1),
  collectionId: z.string().trim().min(1),
  accession: z.string().trim().min(1),
  dueDate: dateISOyyyyMMdd.optional(),
});

export const checkinSchema = z.object({
  patronIdOrUID: z.string().trim().min(1),
  collectionId: z.string().trim().min(1),
  accession: z.string().trim().min(1),
});

export const renewalSchema = z.object({
  patronIdOrUID: z.string().trim().min(1),
  borrowKey: z.string().trim().min(1),
  days: z.number().int().min(1).max(7),
});

export const collectionSearchSchema = z.object({
  searchTerm: z.string().trim().min(1),
});
export const patronsSearchSchema = z.object({ term: z.string().trim().min(1) });
export const copiesSearchSchema = z.object({ term: z.string().trim().min(1) });
export const bookByBarcodeSchema = z.object({ barcode: barcodeSchema });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type RenewalInput = z.infer<typeof renewalSchema>;
