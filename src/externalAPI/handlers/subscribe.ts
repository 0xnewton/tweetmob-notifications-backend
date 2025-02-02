import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { z } from "zod";
import { SubscriptionService } from "../../subscriptions/service";
import { SubscriptionExistsError } from "../../subscriptions/errors";
import { subscriptionAPIMetadataSchema } from "./schemas";
import { Subscription } from "../../subscriptions/types";

export const subscribe = <T>(converter: (arg: Subscription) => T) =>
  onRequest(
    async (request: APIRequest, response: APIResponse): Promise<void> => {
      const user = request.user;
      logger.info("Subscribe event handler", { user });

      if (!user) {
        logger.debug("User not found", { request });
        response.status(401).send("Unauthorized");
        return;
      }

      let webhookURL;
      let xHandle;
      let metadata;
      try {
        ({ webhookURL, xHandle, metadata } = Payload.parse(request.body));
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
            apiMetadata: metadata,
          },
          {
            user,
          }
        );
        const result: SubscribeResponse<T> = {
          data: converter(subscriptionResult.data),
          message: "Successfully subscribed",
        };
        response.status(201).send(result);
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

interface SubscribeResponse<T> {
  data: T;
  message: string;
}

const Payload = z.object({
  webhookURL: z.string(),
  xHandle: z.string(),
  metadata: subscriptionAPIMetadataSchema,
});

type Payload = z.infer<typeof Payload>;
