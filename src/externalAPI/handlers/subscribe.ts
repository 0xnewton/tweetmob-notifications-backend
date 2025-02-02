import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { z } from "zod";
import { SubscriptionService } from "../../subscriptions/service";
import { SubscriptionExistsError } from "../../subscriptions/errors";

export const subscribe = onRequest(
  async (request: APIRequest, response: APIResponse): Promise<void> => {
    logger.info("Subscribe event handler", { request, response });
    const user = request.user;
    if (!user) {
      logger.debug("User not found", { request });
      response.status(401).send("Unauthorized");
      return;
    }

    let webhookURL;
    let xHandle;
    try {
      ({ webhookURL, xHandle } = Payload.parse(request.body));
    } catch (err: any) {
      logger.debug("Invalid payload", {
        request,
        err: err?.details || "An error occured",
      });
      response.status(400).send("Invalid payload");
      return;
    }
    try {
      const subscriptionResult = await SubscriptionService.create(
        {
          webhookURL,
          xHandle,
        },
        {
          user,
        }
      );
      response.status(201).send(subscriptionResult.data);
    } catch (err: any) {
      logger.error("Error creating subscription", {
        errDetails: err?.message || "",
      });
      if (err instanceof SubscriptionExistsError) {
        response.status(400).send("Subscription already exists");
      } else {
        response.status(500).send("Something went wrong. Please try again.");
      }
    }

    return;
  }
);

const Payload = z.object({
  webhookURL: z.string(),
  xHandle: z.string(),
});
