import { z } from "zod";
import type { ProfileFieldErrors } from "@/features/opac/profile/types/opac-profile-types";

export const profileValidationSchema = z.object({
  PhoneNumber: z
    .string()
    .regex(
      /^\d{3}-?\d{3}-?\d{4}$/,
      "Phone number must be in XXX-XXX-XXXX format.",
    ),
  City: z.string().min(1, "City is required."),
  Barangay: z.string().min(1, "Barangay is required."),
  SchoolWork: z.string().min(1, "Education/work status is required."),
});

export function getProfileFieldErrors(
  input: unknown,
): ProfileFieldErrors | null {
  const result = profileValidationSchema.safeParse(input);
  if (result.success) return null;

  return result.error.issues.reduce<ProfileFieldErrors>((errors, issue) => {
    const field = issue.path[0] as keyof ProfileFieldErrors;
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}
