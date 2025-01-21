import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";

export const tweet = onRequest(async (req: APIRequest, res: APIResponse) => {
  logger.info("tweet api route handler");

  return;
});
