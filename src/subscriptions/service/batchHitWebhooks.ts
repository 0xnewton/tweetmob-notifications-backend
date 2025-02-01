import { logger } from "firebase-functions";
import { UnixTimestamp, UserTweet, WebhookPayload } from "../../lib/types";
import { batchFetchKOLSubscriptions } from "../api";
import { Subscription, SubscriptionStatus } from "../types";
import { KOL } from "../../kols/types";
import { ParsedTweetLegacy } from "../../x/types";

interface PingWebhookSubscriptionParams {
  userTweet: UserTweet;
  subscription: Subscription;
}

interface BatchHitWebhooksResponseElement {
  webhookPayload: WebhookPayload;
  webhookHitAt: UnixTimestamp;
  subscription: Subscription;
  kol: KOL;
  tweet: ParsedTweetLegacy;
}

export const batchHitWebhooks = async (
  userTweets: UserTweet[]
): Promise<BatchHitWebhooksResponseElement[]> => {
  logger.info("Batch hitting webhooks service request", { userTweets });
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
  const enhancedSubData: PingWebhookSubscriptionParams[] =
    applicableSubscriptions
      .map((sub) => {
        const userTweet = userTweets.find(
          (ut) => ut.user.id === sub.data.kolID
        );
        if (!userTweet) {
          return null;
        }
        return { userTweet, subscription: sub.data };
      })
      .filter((sub) => sub !== null);

  // Hit all their webhooks
  const result = enhancedSubData.map((sub) => {
    const payload = pingSubscriptionWebhook(sub);
    return {
      webhookPayload: payload,
      subscription: sub.subscription,
      kol: sub.userTweet.user,
      tweet: sub.userTweet.tweet,
      webhookHitAt: Date.now(),
    };
  });

  return result;
};

const pingSubscriptionWebhook = ({
  userTweet,
  subscription,
}: PingWebhookSubscriptionParams): WebhookPayload => {
  logger.info("Pinging subscription webhook", { userTweet, subscription });
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
  logger.info("Pinging subscription webhook", { body, subscription });

  fetch(subscription.webhookURL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return body;
};
