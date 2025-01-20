import { onRequest } from "firebase-functions/v2/https";
import { tgBotAPIKey } from "../lib/secrets";
import { initializeBot } from "./bot";

// Set up webhook for Telegram bot
export const app = onRequest({ secrets: [tgBotAPIKey] }, (req, res) => {
  const botAPIKey = tgBotAPIKey.value();
  const bot = initializeBot(botAPIKey);
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});
