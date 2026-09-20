import { useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Modal from "@/components/ui/ValidationModal";
import { usePatronRegister } from "@/features/lms/patrons/pages/register-patron/api/patrons-register-logic";
import RegisterSidebar from "@/features/lms/patrons/pages/register-patron/components/RegisterSidebar";
import RegisterContainer from "@/features/lms/patrons/pages/register-patron/components/RegisterContainer";

export default function PatronRegister() {
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const {
    form,
    setField,
    setMany,
    fieldErrors,
    step,
    goPersonal,
    proceedToAccount,
    performRegister,
    loading,
    error,
    success,
    setError,
    setSuccess,
    cities,
    barangays,
    fourYearsAgo,
    idFile,
    setIdFile,
    previewUrl,
    setPreviewUrl,
  } = usePatronRegister();

  const handleRegister = async () => {
    if (!executeRecaptcha) {
      console.error("reCAPTCHA not available");
      return false;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const captchaToken = await executeRecaptcha("patron_register");
      if (!captchaToken) {
        console.error("Failed to get reCAPTCHA token");
        return false;
      }

      const result = await performRegister(captchaToken);
      if (result.ok) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        navigate("/lms/patrons", {
          state: {
            successMessage: result.message || "Patron registered successfully!",
          },
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Registration error:", err);
      return false;
    }
  };

  return (
    <div className="overflow-auto px-6 sm:px-8 py-2 pb-6 sm:pb-8 sm:pb-10 xl:p-10 font-[gothamLight]">
      <div className="mx-auto flex w-full flex-col gap-0 xl:gap-8 xl:flex-row">
        <RegisterSidebar onReturn={() => navigate(-1)} />

        <RegisterContainer
          step={step}
          form={form}
          setField={setField}
          setMany={setMany}
          fieldErrors={fieldErrors}
          loading={loading}
          cities={cities}
          barangays={barangays}
          fourYearsAgo={fourYearsAgo}
          idFile={idFile}
          setIdFile={setIdFile}
          previewUrl={previewUrl}
          setPreviewUrl={setPreviewUrl}
          onProceedToAccount={proceedToAccount}
          onGoPersonal={goPersonal}
          onRegister={handleRegister}
          isSubmitting={loading}
        />
      </div>

      {error && (
        <Modal message={error} onClose={() => setError(null)} type="error" />
      )}

      {success && (
        <Modal message={success} onClose={() => setSuccess(null)} type="success" />
      )}
    </div>
  );
}
