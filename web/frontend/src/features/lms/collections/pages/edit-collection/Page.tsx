import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
import EditSidebar from "@/features/lms/collections/pages/edit-collection/components/EditSidebar";
import RegisterContainer from "@/features/lms/collections/pages/register-collection/components/RegisterContainer";
import {
  initialFormData,
  defaultCollectionImage,
  type CollectionFormData,
  type RegisterConstants,
} from "@/features/lms/collections/pages/register-collection/types/collections-register-types";
import {
  validateFormData,
  getFieldErrors,
} from "@/features/lms/collections/pages/register-collection/schema/collections-register-schema";
import {
  normalizeEdition,
  normalizePageCount,
  normalizeSize,
  normalizeVolume,
  handleTagKeyPress,
  handleTagRemove,
} from "@/features/lms/collections/pages/register-collection/api/collections-register-logic";
import {
  fetchClassCodeMaterialTypes,
  fetchCollectionById,
  editCollection,
} from "@/features/lms/collections/pages/edit-collection/api/collections-edit-logic";

const MAX_COVER_BYTES = 3 * 1024 * 1024;

export default function CollectionsEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fromView =
    (location.state as { from?: string } | null)?.from === "view";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CollectionFormData>({
    ...initialFormData,
  });
  const [originalData, setOriginalData] = useState<CollectionFormData>({
    ...initialFormData,
  });
  const [activeTab, setActiveTab] = useState<CollectionFormTab>("title");
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
  const [loadingCollection, setLoadingCollection] = useState(true);
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
    if (!id) {
      setError("No collection ID provided");
      setLoadingCollection(false);
      return;
    }

    const load = async () => {
      setLoadingCollection(true);
      try {
        const collection = await fetchCollectionById(id, true);
        if (!collection) {
          setError("Collection not found");
          return;
        }

        const subjects = Array.isArray(collection.Subjects)
          ? collection.Subjects
          : [];
        const relatedNames = Array.isArray(collection.RelatedNames)
          ? collection.RelatedNames
          : [];

        const loaded: CollectionFormData = {
          CollectionTitle: collection.CollectionTitle || "",
          SecondTitle: collection.SecondTitle || "",
          TitleDescription: collection.TitleDescription || "",
          MainAuthor: collection.MainAuthor || "",
          JointAuthor: collection.JointAuthor || "",
          Author: collection.Author || "",
          Description: collection.Description || "",
          ClassCode: collection.ClassCode || "",
          CallNumber: collection.CallNumber || "",
          CuttersTable: collection.CuttersTable || "",
          Publisher: collection.Publisher || "",
          PublicationPlace: collection.PublicationPlace || "",
          PublicationYear: collection.PublicationYear || "",
          CopyrightYear: collection.CopyrightYear || "",
          SeriesTitle: collection.SeriesTitle || "",
          GeneralNote: collection.GeneralNote || "",
          Size: collection.Size || "",
          Inclusion: collection.Inclusion || "",
          DateReceived: collection.DateReceived || "",
          Acquisition: collection.Acquisition || "",
          CostPrice: collection.CostPrice || "",
          Donor: collection.Donor || "",
          ISBN13: collection.ISBN13 || "",
          ISBN10: collection.ISBN10 || "",
          Edition: collection.Edition || "",
          Volume: collection.Volume || "",
          MaterialType: collection.MaterialType || "",
          PageCount: collection.PageCount || "",
          PrePage: collection.PrePage || "",
          CollectionImage: collection.CollectionImage || defaultCollectionImage,
          RelatedNames: relatedNames,
          Subjects: subjects,
        };

        setOriginalData(loaded);
        setFormData(loaded);
        setSubjectsList(subjects);
        setRelatedNamesList(relatedNames);
        setImagePreview(collection.CollectionImage || defaultCollectionImage);
      } catch (err) {
        console.error("Error loading collection:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load collection data",
        );
      } finally {
        setLoadingCollection(false);
      }
    };

    load();
  }, [id]);

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
      setActiveTab(COLLECTION_TAB_ORDER[currentIndex + 1]);
      return;
    }

    const validationError = validateFormData(formData, constants);
    if (validationError) {
      setError(validationError);
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

  const handleEdit = async () => {
    setError(null);
    const validationError = validateFormData(formData, constants);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await editCollection(
        formData,
        subjectsList,
        relatedNamesList,
        isCustomImage,
        selectedFile,
        id,
      );
      setSuccess("Collection updated successfully.");
      setTimeout(() => {
        if (fromView && id) {
          navigate(`/lms/collections/view/${id}`);
        } else {
          navigate("/lms/collections", { state: { refresh: true } });
        }
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update collection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingConstants || loadingCollection) {
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
        <EditSidebar
          title={formData.CollectionTitle}
          onReturn={() => navigate(-1)}
        />

        <RegisterContainer
          activeTab={activeTab}
          onTabChange={setActiveTab}
          maxUnlockedIndex={COLLECTION_TAB_ORDER.length - 1}
          markPendingStep={false}
          isSubmitting={isSubmitting}
          submitLabel={isLastTab ? "Review Changes" : "Proceed →"}
          footerTitle={isLastTab ? "Review & Confirm" : "Update this step"}
          footerCaption={
            isLastTab
              ? "Compare the changes before saving them."
              : "Adjust any field, then move to the next step."
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
              onUseDefaultImage={() => {
                setFormData((prev) => ({
                  ...prev,
                  CollectionImage: defaultCollectionImage,
                }));
                setImagePreview(defaultCollectionImage);
                setImageEditing(false);
                setSelectedFile(null);
                setIsCustomImage(false);
              }}
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
          originalData={originalData}
          data={{
            ...formData,
            RelatedNames: relatedNamesList,
            Subjects: subjectsList,
          }}
          onClose={() => setShowSummary(false)}
          onSubmit={handleEdit}
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
