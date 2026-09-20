import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePasswordResetLogic } from "@/features/auth/password-reset/api/password-reset";
import type { PasswordResetHook } from "@/features/auth/password-reset/types/password-reset-types";

export function usePasswordReset(): PasswordResetHook {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  const {
    loading: isProcessing,
    error,
    success,
    fieldErrors,
    step,
    codeSent,
    setStep,
    handleRequestCode: requestCode,
    handleVerifyCode: verifyCode,
    handleResetPassword: resetPassword,
    clearFeedback,
  } = usePasswordResetLogic();

  const handleRequestCode = useCallback(async () => {
    const result = await requestCode(email);
    if (result.ok) {
    }
  }, [email, requestCode]);

  const handleVerifyCode = useCallback(async () => {
    const result = await verifyCode(email, code);
    if (result.ok && result.step) {
      setStep(result.step);
    }
  }, [email, code, verifyCode, setStep]);

  const handleResetPassword = useCallback(async () => {
    const result = await resetPassword(
      email,
      code,
      newPassword,
      confirmPassword,
    );
    if (result.ok) {
      setTimeout(() => navigate("/login"), 2000);
    }
  }, [email, code, newPassword, confirmPassword, resetPassword, navigate]);

  const handleCancel = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  const handleCloseModal = useCallback(() => {
    clearFeedback();
  }, [clearFeedback]);

  return {
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
  };
}
