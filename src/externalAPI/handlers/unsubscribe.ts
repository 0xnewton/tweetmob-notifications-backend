import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";

export const unsubscribe = onRequest(
  async (request: APIRequest, response: APIResponse) => {
    logger.info("Unsubscribe event handler");

    return;
  }
);
