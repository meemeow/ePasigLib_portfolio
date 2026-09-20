export interface CaptchaVerdict {
  success: boolean;
  score?: number;
  error?: string;
}

/** Ask Google whether a reCAPTCHA token is genuine. Never throws. */
export async function verifyCaptchaToken(
  token: string,
  secretKey: string,
): Promise<CaptchaVerdict> {
  if (!token || !secretKey) {
    return { success: false, error: "Missing token or secret key" };
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${token}`,
      },
    );
    const data = await response.json();

    return {
      success: data.success === true,
      score: data.score,
      error: data["error-codes"]?.join(", "),
    };
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
