import { logger } from "firebase-functions";
import { tgWebhookSecretToken } from "../../lib/secrets";
import { Request, Response, NextFunction } from "express";

export const validateSecretToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secretInHeader = req.headers["x-telegram-bot-api-secret-token"];
  const expectedSecret = tgWebhookSecretToken.value();
  if (!expectedSecret) {
    logger.error("Expected secret token is not set");
    res.status(500).send("Something went wrong");
    return;
  }
  if (secretInHeader !== expectedSecret) {
    logger.error("Invalid secret token");
    res.status(401).send("Invalid secret token");
    return;
  }

  next();
};
