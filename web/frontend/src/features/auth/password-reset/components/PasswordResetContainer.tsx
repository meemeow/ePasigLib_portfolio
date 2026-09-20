import { useCallback } from "react";
import ValidationModal from "@/components/ui/ValidationModal";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePasswordReset } from "@/features/auth/password-reset/hooks/use-password-reset";

const labelClassName = "text-[#002248] text-sm sm:text-base font-medium";

export default function PasswordResetContainer() {
  const {
    email,
    setEmail,
    code,
    setCode,
    codeSent,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    step,
    error,
    success,
    fieldErrors,
    isProcessing,
    handleRequestCode,
    handleVerifyCode,
    handleResetPassword,
    handleCancel,
    handleCloseModal,
  } = usePasswordReset();

  const getButtonText = () => {
    if (isProcessing) {
      if (step === 1 && !codeSent) return "Sending...";
      if (step === 1 && codeSent) return "Verifying...";
      return "Resetting...";
    }
    if (step === 1 && !codeSent) return "SEND RESET CODE";
    if (step === 1 && codeSent) return "VERIFY CODE";
    return "RESET PASSWORD";
  };

  const handleSubmit = useCallback(async () => {
    if (isProcessing) return;

    if (step === 1) {
      if (!codeSent) {
        await handleRequestCode();
      } else {
        await handleVerifyCode();
      }
    } else {
      await handleResetPassword();
    }
  }, [
    step,
    codeSent,
    handleRequestCode,
    handleVerifyCode,
    handleResetPassword,
    isProcessing,
  ]);

  const isSubmitDisabled = () => {
    if (isProcessing) return true;

    if (step === 1) {
      if (!codeSent) {
        return !email.trim();
      }
      return !email.trim() || !code.trim();
    }

    return (
      !email.trim() ||
      !code.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    );
  };

  const isEmailDisabled = () => isProcessing || codeSent;

  const getStepContent = () => {
    if (step === 1) {
      if (!codeSent) {
        return {
          title: "Reset Password",
          description: "Enter your email to receive a reset code",
        };
      }
      return {
        title: "Enter Reset Code",
        description: "Enter the 6-digit code sent to your email",
      };
    }
    return {
      title: "Create New Password",
      description: "Create your new password",
    };
  };

  const stepContent = getStepContent();

  return (
    <div className="w-full max-w-xl mx-auto border-4 border-white rounded-2xl bg-white shadow-lg overflow-hidden">
      <Card className="bg-[url('/assets/images/pasigLib_bgLMS.jpg')] bg-cover bg-center bg-no-repeat border-none rounded-2xl p-6 sm:p-8 md:p-10 md:px-12 shadow-xl w-full overflow-y-auto">
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
              Verify
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
              New Password
            </Text>
          </div>
        </div>

        <form
          className="font-gothamLight"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="mt-6 text-center mb-6 rounded-xl border border-blue-200 bg-blue-50 py-4 px-4">
            <Text font="medium" className="text-[#002248] text-xl">
              {stepContent.title}
            </Text>
            <Text className="text-gray-500 text-sm">
              {stepContent.description}
            </Text>
          </div>

          <div className="space-y-3">
            {step === 1 && (
              <>
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="example@domain.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEmailDisabled()}
                  error={fieldErrors.email}
                  autoComplete="email"
                  labelClassName={labelClassName}
                  className={codeSent ? "opacity-60 cursor-not-allowed" : ""}
                />

                {codeSent && (
                  <Input
                    type="text"
                    inputMode="numeric"
                    label="Reset Code"
                    placeholder="Enter 6-digit code"
                    required
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    disabled={isProcessing}
                    error={fieldErrors.code}
                    autoComplete="one-time-code"
                    labelClassName={labelClassName}
                  />
                )}
              </>
            )}

            {step === 2 && (
              <>
                <PasswordInput
                  label="New Password"
                  placeholder="Create a strong password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isProcessing}
                  error={fieldErrors.newPassword}
                  autoComplete="new-password"
                  labelClassName={labelClassName}
                  showToggle
                />

                <PasswordInput
                  label="Confirm New Password"
                  placeholder="Confirm your password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isProcessing}
                  error={fieldErrors.confirmPassword}
                  autoComplete="new-password"
                  labelClassName={labelClassName}
                  showToggle
                />
              </>
            )}

            {fieldErrors.form && (
              <Text className="text-red-600 text-xs text-center">
                {fieldErrors.form}
              </Text>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse md:flex-row gap-2.5">
            <Button
              className="font-semibold md:flex-1 gap-2"
              variant="outline"
              type="button"
              onClick={handleCancel}
              disabled={isProcessing}
              size="md"
            >
              <ArrowLeft className="h-4 w-4" />
              BACK TO LOGIN
            </Button>

            <Button
              className="font-semibold md:flex-1"
              variant="secondary"
              type="submit"
              disabled={isSubmitDisabled()}
              size="md"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getButtonText()}
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </div>
        </form>

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
