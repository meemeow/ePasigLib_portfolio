import { z } from "zod";

export const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
export const lettersRegex = /^[A-Za-zÑñ\s]+$/;
export const suffixRegex = /^[A-Za-z.]+$/;
export const barangayRegex = /^[A-Za-z0-9Ññ\s]+$/;

export const patronViewSchema = z.object({
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
    .refine((v) => barangayRegex.test(v), {
      message: "Letters/numbers/spaces only",
    }),
  PhoneNumber: z.string().regex(phoneRegex, "Format: XXX-XXX-XXXX"),
  BirthDate: z.string().min(1, "Birthdate required"),
  Sex: z.string().min(1, "Sex required"),
  Email: z.string().trim().min(1, "Email required").email("Invalid email"),
  SchoolWork: z.string().optional(),
});

export type PatronViewForm = z.infer<typeof patronViewSchema>;
export type PatronFieldErrors = Partial<Record<keyof PatronViewForm, string>>;

export function validatePatronView(
  data: PatronViewForm,
): { success: true } | { success: false; message: string } {
  const parse = patronViewSchema.safeParse(data);
  if (parse.success) return { success: true };
  const msg = parse.error.issues?.[0]?.message || "Invalid form";
  return { success: false, message: msg };
}

export function getPatronFieldErrors(
  data: Partial<PatronViewForm>,
): PatronFieldErrors {
  const result: PatronFieldErrors = {};
  const parse = patronViewSchema.safeParse(data);
  if (parse.success) return result;
  for (const issue of parse.error.issues) {
    const pathKey = issue.path?.[0] as keyof PatronViewForm | undefined;
    if (pathKey && !result[pathKey]) result[pathKey] = issue.message;
  }
  return result;
}