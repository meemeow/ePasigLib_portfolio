import { setGlobalOptions } from "firebase-functions/v2";

export const FUNCTIONS_REGION = "asia-east2";

export const FUNCTIONS_BASE_URL = `https://${FUNCTIONS_REGION}-epasiglib.cloudfunctions.net`;

setGlobalOptions({ region: FUNCTIONS_REGION });
