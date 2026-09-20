import { z } from "zod";

export const loginValidationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(100, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .refine((val) => !/\s/.test(val), {
      message: "Password must not contain spaces",
    }),
});

export type LoginValidation = z.infer<typeof loginValidationSchema>;
