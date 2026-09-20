import { z } from "zod";

export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const EmailSchema = z
  .string()
  .trim()
  .min(1, { message: "Email is required." })
  .email({ message: "Please enter a valid email address." });

export const CodeSchema = z
  .string()
  .min(1, { message: "Reset code is required." })
  .regex(/^\d{6}$/, { message: "Reset code must be a 6-digit number." });

export const NewPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(strongPasswordRegex, {
    message:
      "Password must include at least 1 uppercase, 1 lowercase letter, and 1 number.",
  });

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});

export const PasswordResetVerifySchema = z.object({
  email: EmailSchema,
  code: CodeSchema,
});

export const PasswordResetResetSchema = z
  .object({
    email: EmailSchema,
    code: CodeSchema,
    newPassword: NewPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });
