import { Request, Response, NextFunction } from "express";
import { privateAPIKey } from "../../lib/secrets";
import { logger } from "firebase-functions";

export const privateAPIKeyValidator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info("Validate private API key");
  const apiKey = req.header("x-api-key");
  const expectedKey = privateAPIKey.value();

  if (apiKey !== expectedKey) {
    logger.error("Invalid API Key");
    res.status(401).send("Unauthorized");
    return;
  }

  logger.info("Private API key is valid");
  next();
};
