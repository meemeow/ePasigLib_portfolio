import { z } from "zod";
import type { StaffFormData } from "@/features/lms/staffs/pages/view-staff/types/staffs-view-types";
import { STAFF_PERMISSION_KEYS } from "@/lib/auth/auth-types";

export const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
export const lettersRegex = /^[A-Za-zÑñ\s]+$/;
export const suffixRegex = /^[A-Za-z.]+$/;
export const alphanumericWithSpace = /^[A-Za-z0-9Ññ\s]+$/;

const schemaPermissionKeys = STAFF_PERMISSION_KEYS;

export const homeSchema = z
  .object({
    FirstName: z
      .string()
      .min(1, "First name required")
      .refine((v) => lettersRegex.test(v), {
        message: "Letters/spaces only",
      }),
    MiddleName: z.string().optional(),
    LastName: z
      .string()
      .min(1, "Last name required")
      .refine((v) => lettersRegex.test(v), {
        message: "Letters/spaces only",
      }),
    Suffix: z
      .string()
      .optional()
      .refine((v) => !v || suffixRegex.test(v), {
        message: "Letters and periods only",
      }),
    City: z
      .string()
      .min(1, "City required")
      .refine((v) => lettersRegex.test(v), {
        message: "Letters/spaces only",
      }),
    Barangay: z
      .string()
      .min(1, "Barangay required")
      .refine((v) => alphanumericWithSpace.test(v), {
        message: "Barangay must be letters/numbers/spaces",
      }),
    PhoneNumber: z.string().regex(phoneRegex, "Phone should be XXX-XXX-XXXX"),
    BirthDate: z.string().min(1, "Birthdate required"),
    Sex: z.string().min(1, "Sex required"),
    Email: z.string().trim().min(1, "Email is required").email("Invalid email"),
    JobTitle: z.string().min(1, "Job title required"),
    CatalogingAdd: z.boolean().default(false),
    CatalogingEdit: z.boolean().default(false),
    CatalogingArchive: z.boolean().default(false),
    PatronAdd: z.boolean().default(false),
    PatronEdit: z.boolean().default(false),
    PatronArchive: z.boolean().default(false),
    VerifyIDs: z.boolean().default(false),
    Checkout: z.boolean().default(false),
    Checkin: z.boolean().default(false),
    ApproveRenewals: z.boolean().default(false),
    AnnouncementCreation: z.boolean().default(false),
    ReportGeneration: z.boolean().default(false),
    LiveChat: z.boolean().default(false),
  })
  .refine(
    (vals) => {
      return schemaPermissionKeys.some((k) => vals[k]);
    },
    { message: "Select at least one role." },
  );

export function validateHomeForm(
  data: StaffFormData,
): { success: true } | { success: false; message: string } {
  const parse = homeSchema.safeParse(data);
  if (parse.success) return { success: true };
  const msg = parse.error.issues?.[0]?.message || "Invalid form";
  return { success: false, message: msg };
}

export type StaffHomeFieldErrors = Partial<
  Record<keyof StaffFormData | "Roles", string>
>;

export function getHomeFieldErrors(
  data: Partial<StaffFormData>,
): StaffHomeFieldErrors {
  const result: StaffHomeFieldErrors = {};
  const parse = homeSchema.safeParse(data);
  if (parse.success) return result;
  for (const issue of parse.error.issues) {
    const pathKey = (issue.path?.[0] as keyof StaffFormData | undefined) ??
      (issue.message.includes("role") ? "Roles" : undefined);
    if (pathKey && !result[pathKey]) result[pathKey] = issue.message;
  }
  return result;
}