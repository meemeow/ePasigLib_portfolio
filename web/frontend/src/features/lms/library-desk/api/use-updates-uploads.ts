import { useCallback, useState } from "react";
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import { storage } from "@/lib/firebase";
import { convertImageToWebPWithLimit } from "@/lib/image-utils";
import type {
  UpdateFile,
} from "@/features/lms/library-desk/types/updates-types";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;

const MAX_COVER_BYTES = 1024 * 1024;
const MAX_COVER_WIDTH = 1600;

const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentRejectionReason(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `"${file.name}" is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_ATTACHMENT_BYTES)}.`;
  }
  if (file.type && !ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported file type.`;
  }
  return null;
}

export function coverRejectionReason(file: File): string | null {
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" is not an image.`;
  }
  return null;
}

export function storagePathFromDownloadURL(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/o\/([^?]+)/);
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function uniqueToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(-80);
}

export async function uploadAttachments(
  docId: string,
  files: File[],
  scope: "announcement" | "reply" = "announcement",
  replyToken?: string,
): Promise<UpdateFile[]> {
  const base =
    scope === "reply"
      ? `updates/announcements/${docId}/replies/${replyToken || uniqueToken()}`
      : `updates/announcements/${docId}`;

  return Promise.all(
    files.map(async (file) => {
      const path = `${base}/${uniqueToken()}-${safeName(file.name)}`;
      const reference = storageRef(storage, path);
      await uploadBytes(reference, file, { contentType: file.type });
      return { URL: await getDownloadURL(reference), Name: file.name };
    }),
  );
}

export async function uploadNewsCover(
  docId: string,
  file: File,
): Promise<string> {
  const webp = await convertImageToWebPWithLimit(
    file,
    MAX_COVER_BYTES,
    MAX_COVER_WIDTH,
  );
  const reference = storageRef(
    storage,
    `updates/news/${docId}/${uniqueToken()}.webp`,
  );
  await uploadBytes(reference, webp, { contentType: "image/webp" });
  return getDownloadURL(reference);
}

export async function discardUpload(url: string): Promise<void> {
  const path = storagePathFromDownloadURL(url);
  if (!path) return;
  try {
    await deleteObject(storageRef(storage, path));
  } catch (error) {
    console.warn("Could not remove the uploaded file", path, error);
  }
}

export interface UpdatesUploadState {
  uploading: boolean;
  uploadError: string | null;
  setUploadError: (message: string | null) => void;
  uploadFiles: (
    docId: string,
    files: File[],
    scope?: "announcement" | "reply",
  ) => Promise<UpdateFile[]>;
  uploadCover: (docId: string, file: File) => Promise<string>;
}

export function useUpdatesUploads(): UpdatesUploadState {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (
      docId: string,
      files: File[],
      scope: "announcement" | "reply" = "announcement",
    ): Promise<UpdateFile[]> => {
      if (files.length === 0) return [];
      setUploadError(null);

      for (const file of files) {
        const reason = attachmentRejectionReason(file);
        if (reason) {
          setUploadError(reason);
          throw new Error(reason);
        }
      }

      setUploading(true);
      try {
        return await uploadAttachments(docId, files, scope);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Could not upload the attachments.";
        setUploadError(message);
        throw new Error(message);
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const uploadCover = useCallback(
    async (docId: string, file: File): Promise<string> => {
      setUploadError(null);
      const reason = coverRejectionReason(file);
      if (reason) {
        setUploadError(reason);
        throw new Error(reason);
      }

      setUploading(true);
      try {
        return await uploadNewsCover(docId, file);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Could not upload the cover image.";
        setUploadError(message);
        throw new Error(message);
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  return { uploading, uploadError, setUploadError, uploadFiles, uploadCover };
}
