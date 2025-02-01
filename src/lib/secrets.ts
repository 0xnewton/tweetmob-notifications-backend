import { defineSecret } from "firebase-functions/params";

export enum SecretKeys {
  TG_BOT_API_KEY = "tg_bot_api_key",
  PRIVATE_API_KEY = "private_api_key",
  RAPID_API_KEY = "rapid_api_key",
}

export const tgBotAPIKey = defineSecret(SecretKeys.TG_BOT_API_KEY);
export const privateAPIKey = defineSecret(SecretKeys.PRIVATE_API_KEY);
export const rapidAPIKey = defineSecret(SecretKeys.RAPID_API_KEY);
