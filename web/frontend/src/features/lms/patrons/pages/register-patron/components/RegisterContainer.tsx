import { User, Lock, ShieldCheck } from "lucide-react";
import { COMPACT_CONTROL } from "@/components/ui/control-size";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import PersonalInfoTab from "@/features/lms/patrons/pages/register-patron/components/PersonalInfoTab";
import AccountTab from "@/features/lms/patrons/pages/register-patron/components/AccountTab";
import type {
  PatronRegisterForm,
  PatronRegisterFieldErrors,
  PatronRegisterStep,
} from "@/features/lms/patrons/pages/register-patron/types/patron-register-types";

interface RegisterContainerProps {
  step: PatronRegisterStep;
  form: PatronRegisterForm;
  setField: <K extends keyof PatronRegisterForm>(
    name: K,
    value: PatronRegisterForm[K],
  ) => void;
  setMany: (patch: Partial<PatronRegisterForm>) => void;
  fieldErrors: PatronRegisterFieldErrors;
  loading: boolean;
  cities: string[];
  barangays: string[];
  fourYearsAgo: string;
  idFile: File | null;
  setIdFile: (f: File | null) => void;
  previewUrl: string | null;
  setPreviewUrl: (url: string | null) => void;
  onProceedToAccount: () => Promise<boolean>;
  onGoPersonal: () => void;
  onRegister: () => Promise<boolean>;
  isSubmitting?: boolean;
}

export default function RegisterContainer({
  step,
  form,
  setField,
  fieldErrors,
  loading,
  cities,
  barangays,
  fourYearsAgo,
  idFile,
  setIdFile,
  previewUrl,
  setPreviewUrl,
  onProceedToAccount,
  onGoPersonal,
  onRegister,
  isSubmitting = false,
}: RegisterContainerProps) {
  const isPersonalStep = step === "personal";

  const handleSubmit = async () => {
    if (isPersonalStep) {
      await onProceedToAccount();
    } else {
      await onRegister();
    }
  };

  return (
    <div className="flex h-full min-h-[70vh] w-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      <Tabs value={step} className="flex flex-1 h-full w-full flex-col gap-0">
        <TabsList className="grid min-h-12 h-auto sm:h-16 w-full grid-cols-2 gap-0 rounded-none bg-transparent p-0 shrink-0">
          <TabsTrigger
            value="personal"
            className="h-full flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 text-center leading-tight whitespace-normal rounded-none rounded-tl-xl border-r text-xs text-white sm:text-base md:text-lg data-[state=active]:bg-[#128CF1] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:bg-[#003067] data-[state=inactive]:text-white"
          >
            <User className="size-5 shrink-0" />
            <Text className="text-xs text-white sm:text-base md:text-lg">
              1. Personal Information
            </Text>
          </TabsTrigger>
          <TabsTrigger
            value="account"
            className="h-full flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-2.5 text-center leading-tight whitespace-normal rounded-none rounded-tr-xl text-xs text-white sm:text-base md:text-lg data-[state=active]:bg-[#128CF1] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:bg-[#003067] data-[state=inactive]:text-white"
          >
            {isPersonalStep ? (
              <Lock className="size-4 shrink-0" />
            ) : (
              <User className="size-4 shrink-0" />
            )}
            <Text className="text-xs text-white sm:text-base md:text-lg">
              2. Account &amp; Security
            </Text>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto pb-4 p-7 sm:p-8 sm:pb-6 md:p-10">
          {isPersonalStep ? (
            <PersonalInfoTab
              form={form}
              setField={setField}
              fieldErrors={fieldErrors}
              cities={cities}
              barangays={barangays}
              loading={loading}
              fourYearsAgo={fourYearsAgo}
            />
          ) : (
            <AccountTab
              form={form}
              setField={setField}
              fieldErrors={fieldErrors}
              loading={loading}
              idFile={idFile}
              setIdFile={setIdFile}
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
            />
          )}
        </div>

        <div className="shrink-0 flex flex-col gap-4 border-t bg-white px-8 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 md:h-10 w-9 md:w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF4FE] text-[#128CF1]">
              <ShieldCheck className="size-4 md:size-5" />
            </div>
            <div>
              <Text className="font-[gothamMedium] text-base md:text-lg text-[#003067]">
                {isPersonalStep ? "Review & Confirm" : "Finish Registration"}
              </Text>
              <Text className="text-xs md:text-sm text-gray-500">
                {isPersonalStep
                  ? "You can review all details before proceeding to the next step."
                  : "Double-check the account credentials and ID before submitting."}
              </Text>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {!isPersonalStep && (
              <Button
                variant="outline"
                onClick={onGoPersonal}
                disabled={loading}
                className={`w-auto md:w-[150px] ${COMPACT_CONTROL}`}
              >
                ← Back
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={handleSubmit}
              disabled={loading || isSubmitting}
              className={`${isPersonalStep ? "w-auto" : "w-auto md:w-[150px]"} ${COMPACT_CONTROL}`}
            >
              {isPersonalStep
                ? "Next: Account & Security →"
                : isSubmitting
                  ? "Registering..."
                  : "Register"}
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}