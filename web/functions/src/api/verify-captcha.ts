import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { verifyCaptchaToken } from "../core/captcha";
import { badRequest, forbidden, internal } from "../core/errors";

const recaptchaSecretKey = defineSecret("RECAPTCHA_SECRET_KEY");

/** Below this reCAPTCHA score the caller is treated as a bot. */
const SCORE_THRESHOLD = 0.5;

export const verifyCaptcha = onCall(
  { secrets: ["RECAPTCHA_SECRET_KEY"] },
  async (request) => {
    const token = request.data.token;
    const action = request.data.action || "unknown";

    if (!token) throw badRequest("Missing captcha token");

    const secretKey = recaptchaSecretKey.value();
    if (!secretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not configured");
      throw internal("reCAPTCHA secret key not configured");
    }

    const result = await verifyCaptchaToken(token, secretKey);

    if (!result.success) {
      console.warn(`reCAPTCHA verification failed for action: ${action}`);
      throw forbidden("Captcha verification failed");
    }

    if (result.score !== undefined && result.score < SCORE_THRESHOLD) {
      console.warn(
        `reCAPTCHA score too low for action: ${action}, score: ${result.score}`,
      );
      throw forbidden("Security verification failed");
    }

    return { success: true, score: result.score, action };
  },
);
