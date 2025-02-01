import { logger } from "firebase-functions";
import { User } from "../../users/types";
import {
  createSubscription,
  getExistingSubscriptionByXHandle,
  getUserSubCount,
} from "../api";
import { parseXHandle, isValidXHandle } from "../../lib/x";
import { getKOLByXHandle } from "../../kols/api";
import { KOLService } from "../../kols/service";
import { FetchResult } from "../../lib/types";
import { Subscription } from "../types";
import { isValidURL } from "../../lib/url";
import { SubscriptionExistsError } from "../errors";

const DEFAULT_MAX_SUB_COUNT = 50;

interface CreateSubscriptionParams {
  webhookURL: string;
  xHandle: string;
}

interface CallerContext {
  user: User;
}

export const create = async (
  params: CreateSubscriptionParams,
  context: CallerContext
): Promise<FetchResult<Subscription>> => {
  logger.info("Create subscription service hit", { params, context });
  const parsedXHandle = parseXHandle(params.xHandle);
  if (!isValidXHandle(parsedXHandle)) {
    logger.debug("Invalid XHandle", { parsedXHandle, params });
    throw new Error("Invalid X Handle. Must be a valid twitter handle");
  }

  if (!isValidURL(params.webhookURL)) {
    logger.debug("Invalid webhook URL", { webhookURL: params.webhookURL });
    throw new Error("Invalid webhook URL");
  }

  // Make sure there is no sub for this xhandle already
  let [existingSub, existingKOL, subCount] = await Promise.all([
    getExistingSubscriptionByXHandle({
      xHandle: parsedXHandle,
      userID: context.user.id,
    }),
    getKOLByXHandle(parsedXHandle),
    getUserSubCount(context.user.id),
  ]);

  const maxSubCount = DEFAULT_MAX_SUB_COUNT;

  if (subCount >= maxSubCount) {
    logger.debug("User has reached max subscription count", {
      subCount,
      max: maxSubCount,
    });
    throw new Error(
      `You have reached the maximum number of subscriptions: ${maxSubCount}`
    );
  }

  // Get or create the kol parent document
  if (existingSub) {
    logger.error("Subscription already exists", { params });
    throw new SubscriptionExistsError(
      "Subscription for that account already exists"
    );
  }

  if (!existingKOL) {
    // Make the KOL
    existingKOL = await KOLService.create({
      xHandle: parsedXHandle,
      createdBy: context.user.id,
    });
  }

  // Create the subscription
  const sub = await createSubscription({
    kol: existingKOL.data,
    userID: context.user.id,
    webhookURL: params.webhookURL,
  });

  return sub;
};
