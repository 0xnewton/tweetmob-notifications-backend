import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";

export const subscribe = onRequest(
  async (request: APIRequest, response: APIResponse): Promise<void> => {
    logger.info("Subscribe event handler", { request, response });

    return;
  }
);
