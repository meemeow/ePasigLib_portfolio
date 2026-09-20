import { z } from "zod";
import type { VerifyPatronFieldErrors } from "@/features/lms/patrons/pages/verify-patron/types/patrons-verify-types";

export const verifyPatronSchema = z
  .object({
    action: z.enum(["approve", "reject"], {
      message: "Invalid action.",
    }),
    remarks: z.string(),
  })
  .refine((value) => value.action !== "reject" || value.remarks.trim().length > 0, {
    message: "Remarks are required for rejection.",
    path: ["remarks"],
  });

export function getVerifyPatronFieldErrors(
  input: unknown,
): VerifyPatronFieldErrors | null {
  const result = verifyPatronSchema.safeParse(input);
  if (result.success) return null;

  return result.error.issues.reduce<VerifyPatronFieldErrors>((errors, issue) => {
    const field = issue.path[0] as keyof VerifyPatronFieldErrors;
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}
