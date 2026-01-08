import { logger } from "firebase-functions";
import { User } from "../../users/types";
import { editSubscription } from "../api";
import { FetchResult } from "../../lib/types";
import {
  Subscription,
  SubscriptionAPIMetadata,
  SubscriptionID,
} from "../types";
import { getByID } from "./getByID";
import { SubscriptionNotFoundError } from "../errors";
import { isValidURL } from "../../lib/url";

interface EditSubscriptionParams {
  id: SubscriptionID;
  payload: EditSubscriptionPayload;
}

interface EditSubscriptionPayload {
  webhookURL?: string;
  apiMetadata?: SubscriptionAPIMetadata | null;
}

interface CallerContext {
  user: User;
}

export const edit = async (
  params: EditSubscriptionParams,
  context: CallerContext
): Promise<FetchResult<Subscription>> => {
  logger.info("Edit subscription service hit", { params, context });

  const subscription = await getByID({
    id: params.id,
    context: context,
  });

  if (!subscription) {
    logger.debug("Subscription not found", { params });
    throw new SubscriptionNotFoundError("Subscription not found");
  }

  if (params.payload.webhookURL && !isValidURL(params.payload.webhookURL)) {
    logger.debug("Invalid webhook URL", { webhookURL: params.payload.webhookURL });
    throw new Error("Invalid webhook URL");
  }

  const result = await editSubscription({
    id: subscription.ref.id,
    userID: context.user.id,
    payload: {
      ...params.payload,
      updatedAt: Date.now(),
    },
  });

  if (!result) {
    logger.error("Error editing subscription", {
      params,
    });
    throw new Error("Something went wrong!");
  }

  return result;
};
