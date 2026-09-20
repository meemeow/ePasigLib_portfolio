import { z } from "zod";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const lettersRegex = /^[A-Za-zÑñ\s]+$/;
const suffixRegex = /^[A-Za-z.]+$/;

const calculateAgeFromBirthDate = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export const personalRolesSchema = z.object({
  FirstName: z.string().min(1, "First name is required").regex(lettersRegex, "Letters/spaces only"),
  MiddleName: z.string().optional(),
  LastName: z.string().min(1, "Last name is required").regex(lettersRegex, "Letters/spaces only"),
  Suffix: z.string().optional().refine((v) => !v || suffixRegex.test(v), {
    message: "Letters and periods only",
  }),
  BirthDate: z
      .string()
      .min(1, "Birthdate is required")
      .refine((val) => {
        const age = calculateAgeFromBirthDate(val);
        return age >= 4 && age <= 122;
      }, { message: "Age must be between 4 and 122" }),
  Sex: z.string().min(1, "Sex is required"),
  City: z.string().min(1, "City is required"),
  Barangay: z.string().min(1, "Barangay is required"),
  PhoneNumber: z.string().min(1, "Phone number is required"),
  JobTitle: z.string().min(1, "Job title is required"),

  CatalogingAdd: z.boolean().optional(),
  CatalogingEdit: z.boolean().optional(),
  CatalogingArchive: z.boolean().optional(),
  Checkout: z.boolean().optional(),
  Checkin: z.boolean().optional(),
  ApproveRenewals: z.boolean().optional(),
  PatronAdd: z.boolean().optional(),
  PatronEdit: z.boolean().optional(),
  PatronArchive: z.boolean().optional(),
  VerifyIDs: z.boolean().optional(),
  AnnouncementCreation: z.boolean().optional(),
  ReportGeneration: z.boolean().optional(),
  LiveChat: z.boolean().optional(),
});

const accountSecurityBase = z.object({
  Email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address (e.g., name@example.com)")
    .max(100, "Email address is too long")
    .toLowerCase()
    .transform((val) => val.trim()),
  Password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      strongPasswordRegex,
      "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number",
    )
    .max(50, "Password is too long"),
  ConfirmPassword: z.string().min(1, "Please confirm your password"),
});

export const accountSecuritySchema = accountSecurityBase.refine(
  (data) => data.Password === data.ConfirmPassword,
  {
    message: "Passwords do not match",
    path: ["ConfirmPassword"],
  }
);

export const staffRegisterSchema = personalRolesSchema
  .merge(accountSecurityBase)
  .refine((data) => data.Password === data.ConfirmPassword, {
    message: "Passwords do not match",
    path: ["ConfirmPassword"],
  });
