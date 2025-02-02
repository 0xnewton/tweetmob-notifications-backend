import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { SubscriptionService } from "../../subscriptions/service";
import { Subscription } from "../../subscriptions/types";
import { subscriptionAPIMetadataSchema } from "./schemas";
import { z } from "zod";
import { SubscriptionNotFoundError } from "../../subscriptions/errors";

export const editSubscription = onRequest(
  async (request: APIRequest, response: APIResponse) => {
    logger.info("Edit Subscription event handler", { request, response });
    const user = request.user;
    const subscriptionID = request.params.id;

    if (!user) {
      logger.debug("User not found", { request });
      response.status(401).send("Unauthorized");
      return;
    }

    if (!subscriptionID || typeof subscriptionID !== "string") {
      logger.debug("Subscription ID not found", { request });
      response.status(400).send("Invalid subscription ID");
      return;
    }

    let webhookURL;
    let metadata;
    try {
      ({ webhookURL, metadata } = Payload.parse(request.body));
    } catch (err: any) {
      logger.debug("Invalid payload", {
        request,
        err: err?.details || "An error occured",
      });
      response.status(400).send("Invalid payload");
      return;
    }
    try {
      const subscriptionResult = await SubscriptionService.edit(
        {
          id: subscriptionID,
          payload: {
            webhookURL,
            apiMetadata: metadata,
          },
        },
        {
          user,
        }
      );
      const result: EditResponse = {
        data: subscriptionResult.data,
        message: "Successfully edited subscription",
      };
      response.status(201).send(result);
    } catch (err: any) {
      logger.error("Error editing subscription", {
        errDetails: err?.message || "",
      });
      if (err instanceof SubscriptionNotFoundError) {
        response.status(404).send("Subscription not found");
      } else {
        response.status(500).send("Something went wrong. Please try again.");
      }
    }

    return;
  }
);

interface EditResponse {
  data: Subscription;
  message: string;
}

const Payload = z.object({
  webhookURL: z.string(),
  metadata: subscriptionAPIMetadataSchema,
});
