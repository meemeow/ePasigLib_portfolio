import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
	CollectionFormData,
	defaultCollectionImage,
	type AddCollectionPayload,
	type AddCollectionResult,
	type UpdateCollectionImagePayload,
	type GoogleBooksLookupResponse,
	type GoogleBooksVolume,
	type RegisterConstants,
	type SearchGoogleBooksPayload,
} from "@/features/lms/collections/pages/register-collection/types/collections-register-types";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { invalidateCollectionCaches } from "@/features/lms/collections/collection-cache";

const titleCase = (text: string): string =>
	text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const ordinalSuffix = (n: number): string => {
	const teens = n % 100;
	if (teens >= 11 && teens <= 13) return "th";
	if (n % 10 === 1) return "st";
	if (n % 10 === 2) return "nd";
	if (n % 10 === 3) return "rd";
	return "th";
};

export const normalizeEdition = (edition: string): string => {
	const trimmed = edition.trim();
	if (!trimmed) return "";

	const expanded = trimmed.replace(/\bed\b\.?/gi, "Edition");
	const leadingNumber = expanded.match(/^(\d+)\s*(?:st|nd|rd|th)?\s*(.*)$/i);

	if (leadingNumber) {
		const number = parseInt(leadingNumber[1], 10);
		const rest = titleCase(leadingNumber[2].trim());
		const tail = !rest ? "Edition" : /edition/i.test(rest) ? rest : `${rest} Edition`;
		return `${number}${ordinalSuffix(number)} ${tail}`;
	}

	const titled = titleCase(expanded);
	return /edition/i.test(titled) ? titled : `${titled} Edition`;
};

export const normalizeVolume = (volume: string): string => {
	const trimmed = volume.trim();
	if (!trimmed) return "";

	const match = trimmed.match(/^(?:v|vol|volume)?[.\s]*(\d+)[.\s]*(?:v|vol|volume)?\.?$/i);
	if (match) return `Volume ${parseInt(match[1], 10)}`;

	return titleCase(trimmed);
};

export const normalizePageCount = (pageCount: string): string => {
	const digits = pageCount.replace(/[^0-9]/g, "");
	if (!digits) return "";
	return `${parseInt(digits, 10)} pages`;
};

export const normalizeSize = (size: string): string => {
	if (!size) return "";
	let value = size.trim().toLowerCase();
	let parts = value.split(/\s*x\s*/);
	parts = parts.map((part) => {
		part = part.replace(/cm/g, "").trim();
		if (/^\d+(\.\d+)?$/.test(part)) return part + " cm";
		if (/\d+(\.\d+)?\s*cm$/.test(part)) return part.replace(/\s*cm$/, " cm");
		return part;
	});
	return parts.join(" x ");
};

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

export async function fetchBookFromGoogleBooks(
	isbn: string,
): Promise<GoogleBooksLookupResponse> {
	const trimmed = isbn.trim();
	if (!trimmed) return { status: "invalid", isbn: "", volume: null };

	const payload: SearchGoogleBooksPayload = {
		case: "searchGoogleBooks",
		searchTerm: trimmed,
	};
	return await cachedFetch<GoogleBooksLookupResponse>(
		"searchGoogleBooks",
		payload,
	);
}

export async function fetchClassCodeMaterialTypes(): Promise<RegisterConstants> {
	const data = await cachedFetch<Partial<RegisterConstants>>('fetchClassCodeMaterialTypes') || {};
	return {
		classCodes: Array.isArray(data.classCodes) ? data.classCodes : [],
		materialTypes: Array.isArray(data.materialTypes) ? data.materialTypes : [],
	};
}

export function applyGoogleBookData(
	volume: GoogleBooksVolume,
	prev: CollectionFormData,
): CollectionFormData {
	const [mainAuthor = "", ...otherAuthors] = volume.authors;

	return {
		...prev,
		CollectionTitle: volume.title,
		SecondTitle: volume.subtitle,
		MainAuthor: mainAuthor,
		Author: mainAuthor,
		JointAuthor: otherAuthors.join(", "),
		Publisher: volume.publisher,
		PublicationYear: volume.publicationYear,
		Description: volume.description,
		PageCount: volume.pageCount,
		ISBN13: volume.isbn13,
		ISBN10: volume.isbn10,
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

export async function registerCollection(formData: CollectionFormData, subjectsList: string[], relatedNamesList: string[], isCustomImage: boolean, selectedFile: File | null) {
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

	formData.CollectionImage = defaultCollectionImage;


  const addRecordAttempt = httpsCallable<AddCollectionPayload, AddCollectionResult>(
    functions,
    "addRecordAttempt",
  );
  const updateImageAttempt = httpsCallable<UpdateCollectionImagePayload, { success: true }>(
    functions,
    "addRecordAttempt",
  );

	const payload: AddCollectionPayload = {
		case: "addCollectionRecord",
		...formData,
	};

  const addResp = await addRecordAttempt(payload);
  const generatedUID = addResp.data?.UID || "";
  const docId = addResp.data?.id || "";
  if (!generatedUID) throw new Error("Failed to obtain generated UID from server");

	if (isCustomImage && selectedFile) {
		try {
			const fileName = `${generatedUID}.webp`;
			const storageRef = ref(storage, `collections/${fileName}`);
			const webpBlob = await convertImageToWebP(selectedFile);
			await uploadBytes(storageRef, webpBlob);
			const finalUrl = await getDownloadURL(storageRef);
			formData.CollectionImage = finalUrl;
			const imagePayload: UpdateCollectionImagePayload = {
				case: 'updateCollectionImage',
				docId,
				imageUrl: finalUrl,
			};
			await updateImageAttempt(imagePayload);
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
