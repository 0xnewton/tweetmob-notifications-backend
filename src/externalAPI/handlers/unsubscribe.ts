import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { SubscriptionService } from "../../subscriptions/service";
import { SubscriptionNotFoundError } from "../../subscriptions/errors";
import { Subscription } from "../../subscriptions/types";

export const unsubscribe = <T>(converter: (arg: Subscription) => T) =>
  onRequest(async (request: APIRequest, response: APIResponse) => {
    logger.info("Unsubscribe event handler", { request, response });
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

    try {
      const subscription = await SubscriptionService.unsubscribe({
        id: subscriptionID,
        context: {
          user,
        },
      });

      const responseBody: UnsubscribeResponse<T> = {
        data: converter(subscription.data),
        message: "Successfully unsubscribed",
      };

      response.status(200).send(responseBody);
    } catch (err: any) {
      if (err instanceof SubscriptionNotFoundError) {
        response.status(404).send("Subscription not found");
        return;
      }
      logger.error("Error unsubscribing", {
        errDetails: err?.message || "",
      });
      response.status(500).send("Something went wrong. Please try again.");
    }

    return;
  });

interface UnsubscribeResponse<T> {
  data: T;
  message: string;
}
