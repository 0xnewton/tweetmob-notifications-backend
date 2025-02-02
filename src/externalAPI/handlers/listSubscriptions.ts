import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { SubscriptionService } from "../../subscriptions/service";
import { Subscription, SubscriptionID } from "../../subscriptions/types";

const MAX_LIMIT_SIZE = 1000;
const DEFAULT_LIMIT_SIZE = 100;

export const listSubscriptions = <T>(converter: (arg: Subscription) => T) =>
  onRequest(
    async (request: APIRequest, response: APIResponse): Promise<void> => {
      const user = request.user;
      const limit =
        typeof request.query.limit === "string"
          ? Math.min(parseInt(request.query.limit), MAX_LIMIT_SIZE)
          : DEFAULT_LIMIT_SIZE;
      const cursor =
        typeof request.query.cursor === "string"
          ? request.query.cursor
          : undefined;

      logger.info("List subscriptions event handler", {
        user,
        limit,
        response,
      });

      if (!user) {
        logger.debug("User not found", { request });
        response.status(401).send("Unauthorized");
        return;
      }

      try {
        const subscriptionList = await SubscriptionService.list({
          filter: {
            limit,
            cursor,
            orderBy: {
              key: "xHandle",
              direction: "asc",
            },
          },
          context: {
            user,
          },
        });
        const responsePayload: ListSubscriptionsAPIResponse<T> = {
          data: subscriptionList.data.map((subscription) =>
            converter(subscription.data)
          ),
          cursor: subscriptionList.cursor,
          hasNextPage: subscriptionList.hasNextPage,
          limit: subscriptionList.limit,
        };
        response.status(200).send(responsePayload);
      } catch (err: any) {
        logger.error("Error fetching subscriptions", {
          errDetails: err?.message || "",
        });
        response.status(500).send("Something went wrong. Please try again.");
      }

      return;
    }
  );

interface ListSubscriptionsAPIResponse<T> {
  data: T[];
  cursor: SubscriptionID | null;
  hasNextPage: boolean;
  limit: number;
}
