import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cachedFetch } from '@/lib/fetching-data-cache';
import { invalidateCollectionCaches } from '@/features/lms/collections/collection-cache';
import { fetchCollectionById } from '@/features/lms/collections/api/collection-record';
import { getAuth } from "firebase/auth";
import {
    EditCollectionFormData,
    type EditCollectionConstants,
    type EditCollectionPayload,
    type EditCollectionResult,
    type UpdateCollectionImagePayload,
} from "@/features/lms/collections/pages/edit-collection/types/collections-edit-types";
import {
    normalizeEdition,
    normalizePageCount,
    normalizeSize,
    normalizeVolume,
} from "@/features/lms/collections/pages/register-collection/api/collections-register-logic";

export { normalizeEdition, normalizePageCount, normalizeSize, normalizeVolume };

export const convertImageToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = () => { if (typeof reader.result === "string") img.src = reader.result; };
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject("Canvas context not available");
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => b ? resolve(b) : reject("Conversion to WebP failed"), "image/webp", 0.8);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export async function fetchClassCodeMaterialTypes(): Promise<EditCollectionConstants> {
    const data =
        (await cachedFetch<Partial<EditCollectionConstants>>('fetchClassCodeMaterialTypes')) || {};
    return {
        classCodes: Array.isArray(data.classCodes) ? data.classCodes : [],
        materialTypes: Array.isArray(data.materialTypes) ? data.materialTypes : [],
    };
}

export function handleTagKeyPress(
    e: React.KeyboardEvent<HTMLInputElement>,
    listSetter: React.Dispatch<React.SetStateAction<string[]>>,
    currentList: string[]
) {
    if (e.key === "Enter" && e.currentTarget.value.trim()) {
        e.preventDefault();
        const newItem = e.currentTarget.value.trim();
        if (!currentList.includes(newItem)) {
            listSetter([...currentList, newItem]);
            e.currentTarget.value = "";
        }
    }
}

export function handleTagRemove(
    itemToRemove: string,
    listSetter: React.Dispatch<React.SetStateAction<string[]>>,
    currentList: string[]
) {
    listSetter(currentList.filter((item) => item !== itemToRemove));
}

export async function editCollection(formData: EditCollectionFormData, subjectsList: string[], relatedNamesList: string[], isCustomImage: boolean, selectedFile: File | null, targetId?: string) {
  const storage = getStorage();
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  formData.Subjects = subjectsList;
  formData.RelatedNames = relatedNamesList;
  formData.Edition = normalizeEdition(formData.Edition);
  formData.Volume = normalizeVolume(formData.Volume);
  formData.PageCount = normalizePageCount(formData.PageCount);
  formData.Size = normalizeSize(formData.Size);




    const docId = String(targetId || "").trim();
    if (!docId) throw new Error("No collection selected to edit");

    const payload: EditCollectionPayload = {
        case: "editCollectionInformation",
        targetUID: docId,
        profileData: formData,
    };

    const editRecordAttempt = httpsCallable<EditCollectionPayload, EditCollectionResult>(
        functions,
        "editRecordAttempt",
    );
    await editRecordAttempt(payload);

    const fetched = await fetchCollectionById(docId).catch(() => null);
    const generatedUID = fetched?.UID || docId;

    if (isCustomImage && selectedFile) {
        try {
            const fileName = `${generatedUID}.webp`;
            const storageRef = ref(storage, `collections/${fileName}`);
            const webpBlob = await convertImageToWebP(selectedFile);
            await uploadBytes(storageRef, webpBlob);
            const finalUrl = await getDownloadURL(storageRef);
            formData.CollectionImage = finalUrl;
            const updateImageAttempt = httpsCallable<UpdateCollectionImagePayload, { success: true }>(
                functions,
                "addRecordAttempt",
            );
            await updateImageAttempt({ case: 'updateCollectionImage', docId, imageUrl: finalUrl });
        } catch (e) {
            console.error('Image upload/update failed:', e);
            throw new Error(
                e instanceof Error && e.message
                    ? e.message
                    : 'Failed to upload collection image',
            );
        }
    }


    invalidateCollectionCaches();

  return generatedUID;
}

export { fetchCollectionById };

export { convertImageToWebPWithLimit } from "@/lib/image-utils";
