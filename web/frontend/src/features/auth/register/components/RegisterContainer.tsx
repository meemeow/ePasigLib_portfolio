import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import ValidationModal from "@/components/ui/ValidationModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRegisterLogic } from "@/features/auth/register/api/register-logic";
import { getCities, getBarangays } from "@/lib/constants/cities_barangays";
import RegisterPersonalInfo from "@/features/auth/register/components/RegisterPersonalInfo";
import RegisterCredentials from "@/features/auth/register/components/RegisterCredentials";
import {
  personalInfoSchema,
  credentialsBaseSchema,
  validatePasswordMatch,
} from "@/features/auth/register/schema/register-schema";
import type {
  PersonalInfoForm,
  CredentialsForm,
} from "@/features/auth/register/schema/register-schema";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Text } from "@/components/ui/Text";

const DEFAULT_AVATAR =
  "https://firebasestorage.googleapis.com/v0/b/epasiglib.firebasestorage.app/o/avatar%2Fdefault_avatar.jpg?alt=media&token=66b8e756-dc72-4488-a223-c7929683a7f3";

const fourYearsAgo = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
})();

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

const capitalizeWords = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function RegisterContainer() {
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [step, setStep] = useState<1 | 2>(1);
  const isProcessingRef = useRef(false);

  const [cities, setCities] = useState<string[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [serverErrors, setServerErrors] = useState<{
    Email?: string;
    captcha?: string;
    form?: string;
  }>({});

  const {
    loading: isProcessing,
    error,
    success,
    performRegister,
    clearFeedback,
  } = useRegisterLogic();

  const personalInfoForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      FirstName: "",
      LastName: "",
      MiddleName: "",
      BirthDate: "",
      Barangay: "",
      City: "",
      PhoneNumber: "",
      SchoolWork: "",
      Sex: "",
      Suffix: "",
      ID: "",
      Avatar: DEFAULT_AVATAR,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    shouldUnregister: false,
  });

  const credentialsForm = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsBaseSchema),
    defaultValues: {
      Email: "",
      Password: "",
      ConfirmPassword: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
    shouldUnregister: false,
  });

  const watchedCity = personalInfoForm.watch("City");

  isProcessingRef.current = isProcessing || isRedirecting;

  useEffect(() => {
    const fetchCities = async () => {
      const citiesData = await getCities();
      setCities(citiesData);
    };
    fetchCities();
  }, []);

  useEffect(() => {
    const fetchBarangays = async () => {
      if (watchedCity) {
        const brgyData = await getBarangays(watchedCity);
        setBarangays(brgyData);
        personalInfoForm.setValue("Barangay", "");
      } else {
        setBarangays([]);
      }
    };
    fetchBarangays();
  }, [watchedCity, personalInfoForm.setValue]);

  const handleCancel = () => {
    navigate("/login");
  };

  const handleCloseModal = () => {
    clearFeedback();
    setServerErrors({});
  };

  const handleStep1Next = personalInfoForm.handleSubmit(() => {
    setStep(2);
  });

  const handleStep2Back = () => {
    setStep(1);
    setServerErrors({});
  };

  const handleStep2Register = useCallback(
    async (data: CredentialsForm) => {
      if (isProcessingRef.current) return;

      const passwordMatchError = validatePasswordMatch(data);
      if (passwordMatchError) {
        credentialsForm.setError("ConfirmPassword", {
          type: "manual",
          message: passwordMatchError,
        });
        return;
      }

      setServerErrors({});

      if (!executeRecaptcha) {
        setServerErrors({
          captcha: "Security verification is loading. Please try again.",
        });
        return;
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const captchaToken = await executeRecaptcha("register");
        if (!captchaToken) {
          setServerErrors({
            captcha: "Failed to get security verification. Please try again.",
          });
          return;
        }

        const personalData = personalInfoForm.getValues();
        const fullData = {
          ...personalData,
          ...data,
          ID: personalData.ID || "",
          Avatar: personalData.Avatar || DEFAULT_AVATAR,
        };

        const result = await performRegister(fullData, idFile, captchaToken);

        if (!result.ok && result.fieldErrors) {
          const serverFieldErrors = result.fieldErrors;

          Object.entries(serverFieldErrors).forEach(([field, message]) => {
            if (field === "captcha" || field === "form") {
              setServerErrors((prev) => ({ ...prev, [field]: message }));
            } else if (field === "Email") {
              credentialsForm.setError("Email", {
                type: "server",
                message: message as string,
              });
            }
          });

          return;
        }

        if (result.ok) {
          setIsRedirecting(true);
          setTimeout(() => {
            navigate(`/verify_email?email=${encodeURIComponent(data.Email)}`);
          }, 1500);
        }
      } catch (err) {
        console.error("Submission error:", err);
        setServerErrors({
          captcha: "Security verification failed. Please refresh and try again.",
        });
      }
    },
    [
      executeRecaptcha,
      performRegister,
      idFile,
      navigate,
      personalInfoForm,
      credentialsForm,
    ],
  );

  const isStep1Valid = () => {
    const fields = personalInfoForm.watch();
    return (
      fields.FirstName?.trim() !== "" &&
      fields.LastName?.trim() !== "" &&
      fields.BirthDate?.trim() !== "" &&
      fields.City?.trim() !== "" &&
      fields.Barangay?.trim() !== "" &&
      fields.PhoneNumber?.trim() !== "" &&
      fields.SchoolWork?.trim() !== "" &&
      fields.Sex?.trim() !== "" &&
      idFile !== null
    );
  };

  const isStep2Valid = () => {
    const { isValid } = credentialsForm.formState;
    const password = credentialsForm.watch("Password");
    const confirmPassword = credentialsForm.watch("ConfirmPassword");
    return isValid && password === confirmPassword && password.length >= 8;
  };

  return (
    <div className="w-full max-w-3xl mx-auto border-4 border-white rounded-2xl bg-white shadow-lg overflow-hidden">
      <Card className="bg-[url('/assets/images/pasigLib_bgLMS.jpg')] bg-cover bg-center bg-no-repeat border-none rounded-2xl p-6 sm:p-8 md:p-10 md:px-12 shadow-xl overflow-y-auto">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 1
                  ? "bg-[#002248] text-white"
                  : "bg-blue-600 text-white"
              }`}
            >
              {step === 1 ? "1" : "✓"}
            </div>
            <Text
              className={`text-sm ${step === 1 ? "text-[#002248] font-medium" : "text-gray-600"}`}
            >
              Personal
            </Text>
          </div>
          <div className="w-12 h-px bg-gray-400" />
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 2
                  ? "bg-[#002248] text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              2
            </div>
            <Text
              className={`text-sm ${step === 2 ? "text-[#002248] font-medium" : "text-gray-600"}`}
            >
              Credentials
            </Text>
          </div>
        </div>

        {step === 1 && (
          <form noValidate onSubmit={handleStep1Next}>
            <RegisterPersonalInfo
              register={personalInfoForm.register}
              setValue={personalInfoForm.setValue}
              watch={personalInfoForm.watch}
              control={personalInfoForm.control}
              errors={personalInfoForm.formState.errors}
              isProcessing={isProcessingRef.current}
              cities={cities}
              barangays={barangays}
              fourYearsAgo={fourYearsAgo}
              formatPhoneNumber={formatPhoneNumber}
              capitalizeWords={capitalizeWords}
              idFile={idFile}
              previewUrl={previewUrl}
              onFileSelect={setIdFile}
              onPreviewChange={setPreviewUrl}
            />

            <div className="mt-6 flex flex-col-reverse md:flex-row gap-2.5">
              <Button
                className="font-semibold md:flex-1"
                variant="cancel"
                type="button"
                onClick={handleCancel}
                size="md"
                disabled={isProcessingRef.current}
              >
                CANCEL
              </Button>
              <Button
                className="font-semibold md:flex-1 gap-2"
                variant="secondary"
                type="submit"
                disabled={!isStep1Valid() || isProcessingRef.current}
                size="md"
              >
                NEXT
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            noValidate
            onSubmit={credentialsForm.handleSubmit(handleStep2Register)}
          >
            <RegisterCredentials
              register={credentialsForm.register}
              errors={credentialsForm.formState.errors}
              serverErrors={serverErrors}
              isProcessing={isProcessingRef.current}
            />

            <div className="mt-6 md:mt-10 flex flex-col-reverse md:flex-row gap-2.5 w-full max-w-3xl mx-auto">
              <Button
                className="font-semibold md:flex-1 gap-2"
                variant="outline"
                type="button"
                onClick={handleStep2Back}
                size="md"
                disabled={isProcessingRef.current}
              >
                <ArrowLeft className="h-4 w-4" />
                BACK
              </Button>
              <Button
                className="font-semibold md:flex-1"
                variant="secondary"
                type="submit"
                disabled={!isStep2Valid() || isProcessingRef.current}
                size="md"
              >
                {isProcessingRef.current ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "REGISTER"
                )}
              </Button>
            </div>
          </form>
        )}

        {error && (
          <ValidationModal
            message={error}
            onClose={handleCloseModal}
            type="error"
          />
        )}

        {success && (
          <ValidationModal
            message={success}
            onClose={handleCloseModal}
            type="success"
          />
        )}
      </Card>
    </div>
  );
}
