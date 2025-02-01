import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { logger } from "firebase-functions";

export const demoWebhookHandler = onRequest(
  async (request: APIRequest, response: APIResponse) => {
    const body = request.body;
    logger.info("demoWebhookHandler api route handler", { body });

    response.status(200).send({ message: "Notification received" });

    return;
  }
);
