import { Subscription } from "../../subscriptions/types";
import { SubscriptionV1 } from "../types";

export const convertSubscriptionV1 = (
  subscription: Subscription
): SubscriptionV1 => {
  return {
    id: subscription.id,
    kolID: subscription.kolID,
    xHandle: subscription.xHandle,
    createdBy: subscription.createdBy,
    webhookURL: subscription.webhookURL,
    status: subscription.status,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    apiMetadata: subscription.apiMetadata,
  };
};
