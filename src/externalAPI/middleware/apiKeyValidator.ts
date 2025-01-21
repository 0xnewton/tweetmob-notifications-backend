import { logger } from "firebase-functions";
import { APIRequest, APIResponse, APINextFunction } from "../types";
import { ApiKeys } from "../../apiKeys/service";

export const apiKeyValidator = async (
  req: APIRequest,
  res: APIResponse,
  next: APINextFunction
) => {
  logger.info("Validating API Key");
  const apiKey = req.headers["x-api-key"];

  if (typeof apiKey !== "string") {
    logger.info("API key is not a string in request", { type: typeof apiKey });
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    const { user } = await ApiKeys.validate(apiKey);
    req.user = user.data;
  } catch (err) {
    logger.error("Error validating API key", { error: err });
    res.status(401).send("Unauthorized");
    return;
  }

  next();
};
