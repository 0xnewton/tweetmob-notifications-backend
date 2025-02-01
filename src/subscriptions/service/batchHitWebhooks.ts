import { logger } from "firebase-functions";
import { UnixTimestamp, UserTweet, WebhookPayload } from "../../lib/types";
import { batchFetchKOLSubscriptions } from "../api";
import {
  ResponseError,
  Subscription,
  SubscriptionStatus,
  WebhookResponseData,
} from "../types";
import { KOL } from "../../kols/types";
import { ParsedTweetLegacy } from "../../x/types";
import { batch } from "../../lib/utils";
import axios, { AxiosResponse } from "axios";
import { TimeoutError } from "../utils";

export interface HitWebhooksResponse {
  webhookPayload: WebhookPayload;
  webhookHitAt: UnixTimestamp;
  response: WebhookResponseData | null;
  error: ResponseError | null;
  subscription: Subscription;
  kol: KOL;
  tweet: ParsedTweetLegacy;
}

interface EnhancedSubscription {
  userTweet: UserTweet;
  subscription: Subscription;
}

export const hitWebhooks = async (
  userTweets: UserTweet[],
  maxConcurrentRequests = 200
): Promise<HitWebhooksResponse[]> => {
  logger.info("Batch hitting webhooks service request", {
    userTweets,
    maxConcurrentRequests,
  });
  // Fetch all subscriptions for each user
  const allSubscriptions = await batchFetchKOLSubscriptions(
    userTweets.map((ut) => ut.user.id)
  );

  const applicableSubscriptions = allSubscriptions.filter(
    (sub) =>
      sub.data.webhookURL &&
      [SubscriptionStatus.Active, SubscriptionStatus.Pending].includes(
        sub.data.status
      )
  );
  const enhancedSubData: EnhancedSubscription[] = applicableSubscriptions
    .map((sub) => {
      const userTweet = userTweets.find((ut) => ut.user.id === sub.data.kolID);
      if (!userTweet) {
        return null;
      }
      const subData: EnhancedSubscription = {
        userTweet,
        subscription: sub.data,
      };
      return subData;
    })
    .filter(<T>(sub: T | null): sub is T => sub !== null);
  // .filter((sub) => sub !== null);

  // Hit all their webhooks
  const batches = batch(enhancedSubData, maxConcurrentRequests);

  const responses = await Promise.all(
    batches.map((batch) => batch.map(processWebhook)).flat()
  );

  return responses;
};

const processWebhook = async (data: EnhancedSubscription) => {
  const payload = getWebhookPayload({
    userTweet: data.userTweet,
  });
  let response: WebhookResponseData | null = null;
  let error: ResponseError | null = null;
  try {
    ({ response } = await pingSubscriptionWebhook({
      payload,
      subscription: data.subscription,
    }));
  } catch (err: any) {
    logger.debug("Error pinging subscription webhook", {
      errorDetails: err?.message,
      errStack: err?.stack,
      subscription: data.subscription,
      payload,
    });
    error = { message: err?.message || "Unknown error" };
  }
  return {
    webhookPayload: payload,
    subscription: data.subscription,
    kol: data.userTweet.user,
    tweet: data.userTweet.tweet,
    webhookHitAt: Date.now(),
    error,
    response,
  };
};

export const getWebhookPayload = ({
  userTweet,
}: {
  userTweet: UserTweet;
}): WebhookPayload => {
  // Make HTTP request to webhook URL
  const body: WebhookPayload = {
    tweet: userTweet.tweet,
    user: {
      id: userTweet.user.id,
      xHandle: userTweet.user.xHandle,
      xUserID: userTweet.user.xUserID,
      xUserIDStr: userTweet.user.xUserIDStr,
      xScreenName: userTweet.user.xScreenName,
      xName: userTweet.user.xName,
    },
  };

  return body;
};

interface PingSubscriptionWebhookResponse {
  body: WebhookPayload;
  response: WebhookResponseData;
}

const pingSubscriptionWebhook = async ({
  payload,
  subscription,
  timeout = 5000, // default timeout is 5000ms
}: {
  payload: WebhookPayload;
  subscription: { webhookURL: string };
  timeout?: number;
}): Promise<PingSubscriptionWebhookResponse> => {
  try {
    const axiosResponse: AxiosResponse = await axios.post(
      subscription.webhookURL,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout,
      }
    );

    return {
      body: payload,
      response: {
        ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
        status: axiosResponse.status,
        statusText: axiosResponse.statusText,
        url: axiosResponse.config.url || "",
      },
    };
  } catch (err: any) {
    // Axios error handling
    if (err.code === "ECONNABORTED") {
      throw new TimeoutError(timeout);
    }
    throw err;
  }
};
