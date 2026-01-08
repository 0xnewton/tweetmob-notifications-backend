import { onRequest } from "firebase-functions/v2/https";
import { tgBotAPIKey, tgWebhookSecretToken } from "../lib/secrets";
import { getBot } from "./bot";
import * as express from "express";

const expressApp = express();
expressApp.use(express.json());

type WebhookMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => void;

let webhookMiddleware: WebhookMiddleware | null = null;

expressApp.use(async (req, res, next) => {
  const bot = getBot();
  try {
    if (!webhookMiddleware) {
      webhookMiddleware = await bot.createWebhook({
        domain: "https://notificationbot-qzvlzsqjjq-uc.a.run.app",
        secret_token: tgWebhookSecretToken.value(),
      });
    }
  } catch (error) {
    console.error("Error creating webhook:", error);
    res.status(500).send("Error initializing bot webhook");
    return;
  }

  return webhookMiddleware(req, res, next);
});

// Set up webhook for Telegram bot
export const app = onRequest(
  { secrets: [tgBotAPIKey, tgWebhookSecretToken], minInstances: 1 },
  expressApp
);
