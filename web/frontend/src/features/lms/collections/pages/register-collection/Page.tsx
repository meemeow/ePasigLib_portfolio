import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/ValidationModal";
import { CollectionReviewModal } from "@/features/lms/collections/pages/register-collection/components/CollectionReviewModal";
import {
  AdditionalTab,
  ClassificationTab,
  COLLECTION_TAB_FIELDS,
  COLLECTION_TAB_ORDER,
  PhysicalTab,
  PublicationTab,
  TitleTab,
  type CollectionFormTab,
  type FieldErrors,
} from "@/features/lms/collections/pages/register-collection/components/CollectionFormTabs";
import RegisterSidebar from "@/features/lms/collections/pages/register-collection/components/RegisterSidebar";
import RegisterContainer from "@/features/lms/collections/pages/register-collection/components/RegisterContainer";
import {
  initialFormData,
  defaultCollectionImage,
  type CollectionFormData,
  type GoogleBooksVolume,
  type RegisterConstants,
} from "@/features/lms/collections/pages/register-collection/types/collections-register-types";
import { useIsbnLookup } from "@/features/lms/collections/pages/register-collection/api/use-isbn-lookup";
import {
  validateFormData,
  getFieldErrors,
} from "@/features/lms/collections/pages/register-collection/schema/collections-register-schema";
import {
  normalizeEdition,
  normalizePageCount,
  normalizeSize,
  normalizeVolume,
  applyGoogleBookData,
  registerCollection,
  handleTagKeyPress,
  handleTagRemove,
  fetchClassCodeMaterialTypes,
} from "@/features/lms/collections/pages/register-collection/api/collections-register-logic";

const MAX_COVER_BYTES = 3 * 1024 * 1024;

export default function CollectionsRegister() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CollectionFormData>({
    ...initialFormData,
  });
  const [activeTab, setActiveTab] = useState<CollectionFormTab>("title");
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(defaultCollectionImage);
  const [imageEditing, setImageEditing] = useState(false);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [relatedNamesList, setRelatedNamesList] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [constants, setConstants] = useState<RegisterConstants>({
    classCodes: [],
    materialTypes: [],
  });
  const [loadingConstants, setLoadingConstants] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClassCodeMaterialTypes().then((data) => {
      setConstants({
        classCodes: data.classCodes || [],
        materialTypes: data.materialTypes || [],
      });
      setLoadingConstants(false);
    });
  }, []);

  useEffect(() => {
    const title = formData.CollectionTitle.trim();
    if (!title) {
      setFormData((prev) => ({ ...prev, TitleDescription: "" }));
      return;
    }

    const second = formData.SecondTitle.trim();
    const main = formData.MainAuthor.trim();
    const joint = formData.JointAuthor.trim();

    let suggestion = second && main
      ? `${title}: ${second} / ${main}`
      : second
        ? `${title}: ${second}`
        : main
          ? `${title} / ${main}`
          : `${title} /`;

    if (joint) suggestion = main ? `${suggestion}; ${joint}` : `${suggestion} ${joint}`;

    setFormData((prev) => ({ ...prev, TitleDescription: suggestion }));
  }, [
    formData.CollectionTitle,
    formData.SecondTitle,
    formData.MainAuthor,
    formData.JointAuthor,
  ]);

  const handleGoogleVolume = useCallback((volume: GoogleBooksVolume) => {
    setFormData((prev) => applyGoogleBookData(volume, prev));
    setFieldErrors({});
  }, []);

  const isbnLookup = useIsbnLookup(handleGoogleVolume);

  const clearFieldError = (name: string) =>
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);

    if (
      name === "CallNumber" &&
      value &&
      !/^(?=.*[A-Za-z0-9])[A-Za-z0-9./\-\s]+$/.test(value)
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        CallNumber:
          "Call number may only contain letters, digits, dots, slashes, hyphens and spaces.",
      }));
    }
  };

  const setField = <K extends keyof CollectionFormData>(
    name: K,
    value: CollectionFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name as string);
  };

  const handleImageChange = (file: File) => {
    if (file.size > MAX_COVER_BYTES) {
      setError("Cover image must be less than 3MB.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setImagePreview(previewUrl);
    setIsCustomImage(true);
    setImageEditing(false);
    setFormData((prev) => ({ ...prev, CollectionImage: previewUrl }));
  };

  const handleUseDefaultImage = () => {
    setFormData((prev) => ({
      ...prev,
      CollectionImage: defaultCollectionImage,
    }));
    setImagePreview(defaultCollectionImage);
    setImageEditing(false);
    setSelectedFile(null);
    setIsCustomImage(false);
  };

  const handleProceed = () => {
    const currentIndex = COLLECTION_TAB_ORDER.indexOf(activeTab);
    const allErrors = getFieldErrors(
      { ...formData, RelatedNames: relatedNamesList, Subjects: subjectsList },
      constants,
    );

    const ownedFields = new Set(COLLECTION_TAB_FIELDS[activeTab]);
    const tabErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([key]) => ownedFields.has(key)),
    );

    if (Object.keys(tabErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...tabErrors }));
      return;
    }

    if (currentIndex < COLLECTION_TAB_ORDER.length - 1) {
      const nextIndex = currentIndex + 1;
      setMaxUnlockedIndex((prev) => Math.max(prev, nextIndex));
      setActiveTab(COLLECTION_TAB_ORDER[nextIndex]);
      return;
    }

    const validationError = validateFormData(formData, constants);
    if (validationError) {
      const mapped = [
        "CollectionTitle",
        "MainAuthor",
        "ClassCode",
        "MaterialType",
      ].find((field) =>
        validationError.toLowerCase().includes(field.toLowerCase()),
      );
      if (mapped) {
        setFieldErrors((prev) => ({ ...prev, [mapped]: validationError }));
      } else {
        setError(validationError);
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      RelatedNames: relatedNamesList,
      Subjects: subjectsList,
      Edition: normalizeEdition(prev.Edition),
      Volume: normalizeVolume(prev.Volume),
      PageCount: normalizePageCount(prev.PageCount),
      Size: normalizeSize(prev.Size),
    }));
    setShowSummary(true);
  };

  const handleRegister = async () => {
    setError(null);
    const validationError = validateFormData(formData, constants);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await registerCollection(
        formData,
        subjectsList,
        relatedNamesList,
        isCustomImage,
        selectedFile,
      );
      setSuccess("Collection registered successfully.");
      setTimeout(
        () => navigate("/lms/collections", { state: { refresh: true } }),
        1200,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to register collection.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingConstants) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const isLastTab = activeTab === "additional";

  return (
    <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 font-[gothamLight] sm:pb-10 xl:p-10">
      <div className="mx-auto flex w-full flex-col gap-0 xl:flex-row xl:gap-8">
        <RegisterSidebar
          isbn={isbnLookup.isbn}
          onIsbnChange={isbnLookup.setIsbn}
          onClearIsbn={isbnLookup.clear}
          state={isbnLookup.state}
          volume={isbnLookup.volume}
          onReturn={() => navigate(-1)}
        />

        <RegisterContainer
          activeTab={activeTab}
          onTabChange={setActiveTab}
          maxUnlockedIndex={maxUnlockedIndex}
          isSubmitting={isSubmitting}
          submitLabel={isLastTab ? "Review & Submit" : "Proceed →"}
          footerTitle={isLastTab ? "Review & Confirm" : "Complete this step"}
          footerCaption={
            isLastTab
              ? "Check every detail before adding the collection."
              : "Fill in the required fields to move to the next step."
          }
          onBack={() => {
            const index = COLLECTION_TAB_ORDER.indexOf(activeTab);
            if (index > 0) setActiveTab(COLLECTION_TAB_ORDER[index - 1]);
          }}
          onProceed={handleProceed}
        >
          {activeTab === "title" && (
            <TitleTab
              form={formData}
              errors={fieldErrors}
              onChange={handleChange}
              setField={setField}
            />
          )}
          {activeTab === "classification" && (
            <ClassificationTab
              form={formData}
              errors={fieldErrors}
              onChange={handleChange}
              setField={setField}
              classCodes={constants.classCodes}
              subjects={subjectsList}
              relatedNames={relatedNamesList}
              onAddSubject={(e) =>
                handleTagKeyPress(e, setSubjectsList, subjectsList)
              }
              onRemoveSubject={(tag) =>
                handleTagRemove(tag, setSubjectsList, subjectsList)
              }
              onAddRelatedName={(e) =>
                handleTagKeyPress(e, setRelatedNamesList, relatedNamesList)
              }
              onRemoveRelatedName={(tag) =>
                handleTagRemove(tag, setRelatedNamesList, relatedNamesList)
              }
            />
          )}
          {activeTab === "publication" && (
            <PublicationTab
              form={formData}
              errors={fieldErrors}
              onChange={handleChange}
              setField={setField}
            />
          )}
          {activeTab === "physical" && (
            <PhysicalTab
              form={formData}
              errors={fieldErrors}
              onChange={handleChange}
              setField={setField}
              imagePreview={imagePreview}
              imageEditing={imageEditing}
              fileInputRef={fileInputRef}
              onStartImageEditing={() => setImageEditing(true)}
              onSelectImage={handleImageChange}
              onUseDefaultImage={handleUseDefaultImage}
              onCancelImage={() => {
                setImageEditing(false);
                setSelectedFile(null);
                setImagePreview(
                  formData.CollectionImage || defaultCollectionImage,
                );
              }}
            />
          )}
          {activeTab === "additional" && (
            <AdditionalTab
              form={formData}
              errors={fieldErrors}
              onChange={handleChange}
              setField={setField}
              materialTypes={constants.materialTypes}
            />
          )}
        </RegisterContainer>
      </div>

      {showSummary && (
        <CollectionReviewModal
          data={formData}
          onClose={() => setShowSummary(false)}
          onSubmit={handleRegister}
        />
      )}
      {error && (
        <Modal message={error} onClose={() => setError(null)} type="error" />
      )}
      {success && (
        <Modal
          message={success}
          onClose={() => setSuccess(null)}
          type="success"
        />
      )}
    </div>
  );
}
