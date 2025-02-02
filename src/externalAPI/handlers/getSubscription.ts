import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { SubscriptionService } from "../../subscriptions/service";
import { Subscription } from "../../subscriptions/types";

export const getSubscription = onRequest(
  async (request: APIRequest, response: APIResponse): Promise<void> => {
    logger.info("Get subscription event handler", { request, response });
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
      const subscriptionResult = await SubscriptionService.getByID({
        id: subscriptionID,
        context: {
          user,
        },
      });
      if (!subscriptionResult) {
        response.status(404).send("Subscription not found");
        return;
      }
      const responseBody: GetSubscriptionResponse = {
        data: subscriptionResult.data,
      };
      response.status(200).send(responseBody);
    } catch (err: any) {
      logger.error("Error fetching subscription", {
        errDetails: err?.message || "",
      });
      response.status(500).send("Something went wrong. Please try again.");
    }

    return;
  }
);

interface GetSubscriptionResponse {
  data: Subscription;
}
