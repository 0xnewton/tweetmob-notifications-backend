import { logger } from "firebase-functions/v1";
import { User } from "../../users/types";
import { Subscription, SubscriptionID } from "../types";
import { editSubscription } from "../api";
import { FetchResult } from "../../lib/types";
import { getByID } from "./getByID";
import { SubscriptionNotFoundError } from "../errors";

interface UnsubscribeParams {
  id: SubscriptionID;
  context: {
    user: User;
  };
}

export const unsubscribe = async (
  params: UnsubscribeParams
): Promise<FetchResult<Subscription>> => {
  logger.info("Unsubscribe from Subscription Service request", { params });

  const subscription = await getByID({
    id: params.id,
    context: params.context,
  });

  if (!subscription) {
    logger.debug("Subscription not found", { params });
    throw new SubscriptionNotFoundError("Subscription not found");
  }

  const result = await editSubscription({
    id: subscription.ref.id,
    userID: params.context.user.id,
    payload: {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    },
  });

  if (!result) {
    logger.error("Error unsubscribing", {
      params,
    });
    throw new Error("Something went wrong!");
  }

  return result;
};
