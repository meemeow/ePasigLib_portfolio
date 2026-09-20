import { z } from "zod";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const mobileRegex = /^(9\d{2})[-]?\d{3}[-]?\d{4}$/;
const nameRegex = /^[A-Za-zÑñ\s\-']+$/;

const calculateAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const personalInfoSchema = z.object({
  FirstName: z
    .string()
    .min(1, "First name is required")
    .regex(
      nameRegex,
      "First name can only contain letters, spaces, hyphens, and apostrophes",
    )
    .max(50, "First name is too long")
    .transform((val) => val.trim().replace(/\s+/g, " ")),

  LastName: z
    .string()
    .min(1, "Last name is required")
    .regex(
      nameRegex,
      "Last name can only contain letters, spaces, hyphens, and apostrophes",
    )
    .max(50, "Last name is too long")
    .transform((val) => val.trim().replace(/\s+/g, " ")),

  MiddleName: z
    .string()
    .transform((val) => (val ? val.trim().replace(/\s+/g, " ") : "")),

  Suffix: z.string().transform((val) => (val ? val.trim().toUpperCase() : "")),

  BirthDate: z
    .string()
    .min(1, "Birth date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date (YYYY-MM-DD)")
    .refine(
      (date) => !isNaN(new Date(date).getTime()),
      "Please enter a valid birth date",
    )
    .refine(
      (date) => new Date(date) <= new Date(),
      "Birth date cannot be in the future",
    )
    .refine(
      (date) => {
        const age = calculateAge(date);
        return age >= 4 && age <= 120;
      },
      (date) => {
        const age = calculateAge(date);
        if (age < 4) return { message: "Patrons must be at least 4 years old" };
        return {
          message: "Please enter a valid birth date (age must be 120 or less)",
        };
      },
    ),

  Sex: z
    .string()
    .min(1, "Please select your gender")
    .refine(
      (val) =>
        ["Male", "Female", "Intersex", "Prefer not to say"].includes(val),
      {
        message: "Please select a valid option",
      },
    ),

  City: z
    .string()
    .min(1, "City/Municipality is required")
    .regex(
      /^[A-Za-zÑñ\s\-\.]+$/,
      "City name can only contain letters, spaces, and hyphens",
    )
    .transform((val) => val.trim().replace(/\s+/g, " ")),

  Barangay: z
    .string()
    .min(1, "Barangay is required")
    .regex(
      /^[A-Za-zÑñ0-9\s\-\.]+$/,
      "Barangay name can only contain letters, numbers, spaces, and hyphens",
    )
    .transform((val) => val.trim().replace(/\s+/g, " ")),

  PhoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      mobileRegex,
      "Please enter a valid Philippine mobile number (e.g., 912-345-6789)",
    )
    .transform((val) => {
      const cleaned = val.replace(/-/g, "");
      if (cleaned.length === 10 && cleaned.startsWith("9")) {
        return cleaned;
      }
      if (cleaned.length === 11 && cleaned.startsWith("0")) {
        return cleaned.slice(1);
      }
      return cleaned;
    }),

  SchoolWork: z
    .string()
    .min(1, "Please select your education or work status")
    .refine(
      (val) =>
        [
          "Pre-school",
          "Elementary",
          "Junior High School",
          "Senior High School",
          "College",
          "Graduate Studies",
          "Working Professional",
          "Self-employed",
          "Unemployed",
          "Retired",
          "Person with Disability (PWD)",
          "Senior Citizen",
          "Out of School Youth",
        ].includes(val),
      { message: "Please select a valid status" },
    ),

  ID: z.string(),
  Avatar: z.string().url(),
});

export const credentialsBaseSchema = z.object({
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

  ConfirmPassword: z.string(),
});

export const validatePasswordMatch = (data: {
  Password: string;
  ConfirmPassword: string;
}): string | null => {
  if (data.Password !== data.ConfirmPassword) {
    return "Passwords do not match";
  }
  return null;
};

export const credentialsSchema = credentialsBaseSchema.superRefine(
  (data, ctx) => {
    if (data.Password !== data.ConfirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["ConfirmPassword"],
      });
    }
  },
);

export const fullRegisterSchema = personalInfoSchema
  .merge(credentialsBaseSchema)
  .superRefine((data, ctx) => {
    if (data.Password !== data.ConfirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["ConfirmPassword"],
      });
    }
  });

export type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
export type CredentialsForm = z.infer<typeof credentialsBaseSchema>;
export type FullRegisterForm = z.infer<typeof fullRegisterSchema>;
