import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { cachedFetch } from "@/lib/fetching-data-cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import {
  Loader2,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

export default function VerifyEmailContainer() {
  const [status, setStatus] = useState<
    "waiting" | "verified" | "timeout" | "error"
  >("waiting");
  const [isProcessing, setIsProcessing] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendAttempts, setResendAttempts] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(300);

  const navigate = useNavigate();
  const MAX_RESENDS = 2;

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRedirectedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const currentEmailRef = useRef<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");

  const cleanup = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const checkPatronVerified = useCallback(async (): Promise<boolean> => {
    if (!currentEmailRef.current) return false;
    try {
      const isVerified: boolean = await cachedFetch(
        "checkPatronVerificationStatus",
        {
          email: currentEmailRef.current,
        },
      );

      return !!isVerified;
    } catch (err) {
      console.error("Error checking patron verification:", err);
      return false;
    }
  }, []);

  const setupCooldownTimer = useCallback((cooldownSeconds: number) => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
    setResendCooldown(cooldownSeconds);
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
            cooldownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!email) {
      setStatus("error");
      return;
    }

    currentEmailRef.current = email;
    isMountedRef.current = true;
    hasRedirectedRef.current = false;
    setStatus("waiting");

    setupCooldownTimer(60);

    const endTime = Date.now() + 300 * 1000;
    setTimeRemaining(300);

    timerIntervalRef.current = setInterval(() => {
      const left = Math.round((endTime - Date.now()) / 1000);
      if (left <= 0) {
        setTimeRemaining(0);
        setStatus("timeout");
        cleanup();
      } else {
        setTimeRemaining(left);
      }
    }, 1000);

    const poll = async () => {
      if (!isMountedRef.current || hasRedirectedRef.current) return;

      try {
        const isVerified = await checkPatronVerified();
        if (isVerified && isMountedRef.current && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          setStatus("verified");
          cleanup();
          setTimeout(() => navigate("/login"), 5000);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    pollIntervalRef.current = setInterval(poll, 5000);
    poll();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [email, checkPatronVerified, cleanup, navigate, setupCooldownTimer]);

  const handleCancel = () => {
    setIsProcessing(true);
    cleanup();
    navigate("/login");
  };

  const handleResend = async () => {
    if (!email) return;
    if (resendCooldown > 0) return;
    if (isProcessing) return;
    if (resendAttempts >= MAX_RESENDS) return;

    setIsProcessing(true);
    setResendStatus("idle");
    setResendMessage("");

    try {
      const resendVerification = httpsCallable(
        functions,
        "resendPatronVerificationEmail",
      );

      await resendVerification({ email });

      setResendAttempts((prev) => prev + 1);
      setupCooldownTimer(60);

      setResendStatus("success");
      setResendMessage(
        "Verification email resent! Please check your inbox for the verification link.",
      );

      setTimeout(() => {
        if (isMountedRef.current) {
          setResendStatus("idle");
          setResendMessage("");
        }
      }, 30000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      }

      setResendStatus("error");
      setResendMessage(
        "No pending verification found for this email. Please start registration again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimerColor = (seconds: number): string => {
    if (seconds > 120) return "text-green-500";
    if (seconds > 60) return "text-yellow-500";
    return "text-red-500";
  };

  const renderIcon = () => {
    const iconClass = "w-10 h-10 md:w-12 md:h-12 mx-auto mb-3";
    switch (status) {
      case "waiting":
        return <Mail className={`${iconClass} text-[#002248]`} />;
      case "verified":
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case "timeout":
        return <AlertCircle className={`${iconClass} text-yellow-500`} />;
      case "error":
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      default:
        return <Mail className={`${iconClass} text-[#002248]`} />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="bg-white border-none rounded-2xl p-6 sm:p-8 md:p-10 shadow-xl w-full overflow-y-auto">
        <div className="space-y-3 md:space-y-5 text-center">
          {renderIcon()}

          <Text font="medium" className="text-xl sm:text-3xl text-[#002248]">
            {status === "verified" ? "Email Verified!" : "Verify Your Email"}
          </Text>

          {email && (
            <div className="bg-gray-50 rounded-lg px-4 py-2 inline-block mx-auto border border-gray-100">
              <Text className="text-[#002248] text-xs md:text-sm font-medium">
                {email}
              </Text>
            </div>
          )}

          {status === "waiting" && (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${getTimerColor(timeRemaining)}`} />
                <Text
                  className={`text-lg font-mono font-bold ${getTimerColor(timeRemaining)}`}
                >
                  {formatTime(timeRemaining)}
                </Text>
              </div>
              <Text className="text-gray-400 text-xs">
                Time remaining to verify your email
              </Text>
            </div>
          )}

          {status === "waiting" && (
            <div className="space-y-1">
              <Text className="text-gray-600 font-semibold text-sm">
                A verification email has been sent to your email address.
              </Text>
              <Text className="text-gray-600 text-xs md:text-sm">
                Please check your inbox and click the verification button to
                finish setting up your account.
              </Text>
            </div>
          )}

          {status === "timeout" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
              <Text className="text-yellow-700 text-xs md:text-sm font-medium">
                The verification link has expired. Please start registration
                again.
              </Text>
            </div>
          )}

          {status === "verified" && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Text className="text-green-700 text-xs md:text-sm">
                Your email has been successfully verified! You will be
                redirected shortly.
              </Text>
            </div>
          )}

          {status === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <Text className="text-red-600 text-xs md:text-sm">
                Something went wrong. Please try again or contact support.
              </Text>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-[#002248] transition-all duration-200 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>

            <Button
              variant="secondary"
              onClick={handleResend}
              disabled={
                isProcessing ||
                resendCooldown > 0 ||
                resendAttempts >= MAX_RESENDS ||
                status === "timeout"
              }
              className="bg-[#002248] text-white hover:bg-[#003067] transition-all duration-200 font-medium disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : resendAttempts >= MAX_RESENDS ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Max Attempts Reached
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend ({resendCooldown}s)
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </div>

          {resendStatus === "success" && status === "waiting" && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Text className="text-green-700 text-sm">{resendMessage}</Text>
            </div>
          )}

          {resendStatus === "error" && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <Text className="text-red-600 text-sm">{resendMessage}</Text>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <Text className="text-gray-500 font-medium text-xs mt-1 italic">
              "Patuloy nating gawin ang imposible sa Lungsod ng Pasig!"
            </Text>
            <Text className="text-gray-500 text-[11px] mt-1">
              — Vico Sotto, 2023
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
