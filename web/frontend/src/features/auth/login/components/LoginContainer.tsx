import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import ValidationModal from "@/components/ui/ValidationModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Loader2, CheckSquare, Square } from "lucide-react";
import { useLoginLogic } from "@/features/auth/login/api/login-logic";

const labelClassName = "text-[#002248] text-sm sm:text-base font-medium";

export default function LoginContainer() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { executeRecaptcha } = useGoogleReCaptcha();
  const isProcessingRef = useRef(false);

  const navigate = useNavigate();

  const {
    performLogin,
    loading: isProcessing,
    error,
    success,
    fieldErrors,
    clearFeedback,
  } = useLoginLogic();

  isProcessingRef.current = isProcessing || isRedirecting;

  const handleLogin = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (!email.trim() || !password) return;
    if (!executeRecaptcha) return;

    try {
      const captchaToken = await executeRecaptcha("login");

      if (!captchaToken) return;

      const result = await performLogin({ email, password, rememberMe });

      if (!result.ok) {
        return;
      }

      setIsRedirecting(true);

      if (result.userType === "Patron") {
        setTimeout(() => navigate("/opac/home", { replace: true }), 1500);
        return;
      }
      if (result.userType === "Staff") {
        setTimeout(() => navigate("/lms/home", { replace: true }), 1500);
        return;
      }
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (err) {
      console.error("reCAPTCHA execution failed:", err);
    }
  }, [email, password, rememberMe, executeRecaptcha, performLogin, navigate]);

  const handleCloseModal = useCallback(() => {
    clearFeedback();
  }, [clearFeedback]);

  const isFormValid = email.trim() !== "" && password !== "";
  const canSubmit =
    isFormValid && !isProcessing && !isRedirecting && !!executeRecaptcha;

  const getButtonText = () => {
    if (isProcessing) return "Logging in...";
    if (isRedirecting) return "Redirecting...";
    return "LOG IN";
  };

  return (
    <div className="w-full max-w-xl mx-auto border-4 border-white rounded-2xl bg-white shadow-lg overflow-hidden">
      <Card className="bg-[url('/assets/images/pasigLib_bgLMS.jpg')] bg-cover bg-center bg-no-repeat border-none rounded-2xl p-6 sm:p-8 md:p-9 md:px-12 shadow-xl w-full overflow-y-auto">
        <form
          className="font-gothamLight"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <div className="space-y-2">
            <Input
              type="email"
              label="Email Address"
              placeholder="example@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isProcessing || isRedirecting}
              aria-invalid={!!fieldErrors.email}
              autoComplete="email"
              required
              labelClassName={labelClassName}
            />
            {fieldErrors.email && (
              <Text className="text-red-600 text-xs mt-1" role="alert">
                {fieldErrors.email}
              </Text>
            )}

            <PasswordInput
              placeholder="Enter your password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isProcessing || isRedirecting}
              aria-invalid={!!fieldErrors.password}
              autoComplete="current-password"
              required
              labelClassName={labelClassName}
            />
            {fieldErrors.password && (
              <Text className="text-red-600 text-xs mt-1" role="alert">
                {fieldErrors.password}
              </Text>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div
              className={`flex items-center gap-1.5 ${isProcessing || isRedirecting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              onClick={() => {
                if (!isProcessing && !isRedirecting) {
                  setRememberMe(!rememberMe);
                }
              }}
            >
              {rememberMe ? (
                <CheckSquare className="h-5 w-5 text-[#002248]" />
              ) : (
                <Square className="h-5 w-5 text-[#002248]" />
              )}
              <Text className="text-[#002248] font-semibold font-poppins text-sm">
                Remember me
              </Text>
            </div>

            <Button
              variant="link"
              type="button"
              className="h-auto justify-start px-0 py-0 leading-none text-[#002248] hover:underline text-sm"
              onClick={() => navigate("/password_reset")}
              disabled={isProcessing || isRedirecting}
            >
              Forgot Password?
            </Button>
          </div>

          <div className="mt-4 flex flex-col md:flex-row gap-2">
            <Button
              className="font-semibold md:flex-1"
              variant="secondary"
              type="submit"
              disabled={!canSubmit}
              size="md"
            >
              {isProcessing || isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getButtonText()}
                </>
              ) : (
                "LOG IN"
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
