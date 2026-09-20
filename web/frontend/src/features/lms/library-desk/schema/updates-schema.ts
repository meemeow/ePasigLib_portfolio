import { z } from "zod";

export const SUBJECT_LIMIT = 200;
export const MESSAGE_LIMIT = 1000;
export const NEWS_TITLE_LIMIT = 100;
export const NEWS_DESC_LIMIT = 3000;
export const MAX_TAGS = 10;

export const UpdateFileSchema = z.object({
  URL: z.string().url("Attachment URL is not valid."),
  Name: z.string().min(1, "Attachment name is required."),
});

export const AnnouncementSchema = z.object({
  Subject: z
    .string()
    .trim()
    .min(1, "Subject is required.")
    .max(
      SUBJECT_LIMIT,
      `Subject must be ${SUBJECT_LIMIT} characters or fewer.`,
    ),
  Message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(
      MESSAGE_LIMIT,
      `Message must be ${MESSAGE_LIMIT} characters or fewer.`,
    ),
  Files: z.array(UpdateFileSchema).max(5, "Up to 5 attachments.").default([]),
});

export const ReplySchema = z.object({
  Subject: z
    .string()
    .trim()
    .min(1, "Subject is required.")
    .max(
      SUBJECT_LIMIT,
      `Subject must be ${SUBJECT_LIMIT} characters or fewer.`,
    ),
  Message: z
    .string()
    .trim()
    .min(1, "Message is required.")
    .max(
      MESSAGE_LIMIT,
      `Message must be ${MESSAGE_LIMIT} characters or fewer.`,
    ),
  Files: z.array(UpdateFileSchema).max(5, "Up to 5 attachments.").default([]),
});

const SourceUrlSchema = z
  .string()
  .trim()
  .transform((value) =>
    !value || /^https?:\/\//i.test(value) ? value : `https://${value}`,
  )
  .refine(
    (value) => !value || z.string().url().safeParse(value).success,
    "Enter a valid link, for example pasigcity.gov.ph/news.",
  );

export const NewsSchema = z.object({
  Title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(
      NEWS_TITLE_LIMIT,
      `Title must be ${NEWS_TITLE_LIMIT} characters or fewer.`,
    ),
  Description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(
      NEWS_DESC_LIMIT,
      `Description must be ${NEWS_DESC_LIMIT} characters or fewer.`,
    ),
  Tags: z
    .array(z.string().trim().min(1))
    .max(MAX_TAGS, `Up to ${MAX_TAGS} tags.`)
    .default([]),
  ImageURL: z.string().trim().default(""),
  URL: SourceUrlSchema.default(""),
  MainAuthor: z
    .string()
    .trim()
    .max(120, "Author name is too long.")
    .default(""),
  Location: z.string().trim().max(120, "Location is too long.").default(""),
});

export const NewsEditSchema = NewsSchema;
export const AnnouncementEditSchema = AnnouncementSchema;

export type AnnouncementInput = z.infer<typeof AnnouncementSchema>;
export type ReplyInput = z.infer<typeof ReplySchema>;
export type NewsInput = z.infer<typeof NewsSchema>;

export function fieldErrors<K extends string = string>(
  error: z.ZodError,
): Partial<Record<K, string>> {
  const result: Partial<Record<K, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "") as K;
    if (key && !result[key]) result[key] = issue.message;
  }
  return result;
}
