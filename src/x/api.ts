import { logger } from "firebase-functions";
import { rapidAPIKey } from "../lib/secrets";
import { ParsedTweetLegacy, UserTweetRootObject } from "./types";
import { batch } from "../lib/utils";

const DEFAULT_RECENT_TWEET_LIMIT_MINS = 5;
const DEFAULT_MAX_TWEETS = 5;

export interface BatchFetchUserTweetsResponse {
  userID: string;
  tweets: ParsedTweetLegacy[];
}
export const batchFetchUserTweets = async (
  userIDs: string[],
  maxTweets = DEFAULT_MAX_TWEETS,
  recentTimeMins = DEFAULT_RECENT_TWEET_LIMIT_MINS
): Promise<BatchFetchUserTweetsResponse[]> => {
  if (userIDs.length === 0) {
    logger.warn("No user IDs provided");
    return [];
  }

  const userBatch = batch(userIDs, 5);
  const results: BatchFetchUserTweetsResponse[] = [];

  for (const [batchIndex, batch] of userBatch.entries()) {
    const start = Date.now();
    const promises = batch.map((userID) =>
      fetchUserTweets(userID, maxTweets, recentTimeMins)
    );
    const intermediateResults = await Promise.all(promises);

    results.push(
      ...intermediateResults.map((tweets, idx) => ({
        userID: batch[idx],
        tweets,
      }))
    );

    if (batchIndex < userBatch.length - 1) {
      const elapsedTime = Date.now() - start;
      if (elapsedTime < 1100) {
        await new Promise((resolve) => setTimeout(resolve, 1100 - elapsedTime));
      }
    }
  }

  return results;
};

export const fetchUserTweets = async (
  userRestID: string,
  maxTweets = DEFAULT_MAX_TWEETS,
  recentTimeMins = DEFAULT_RECENT_TWEET_LIMIT_MINS
): Promise<ParsedTweetLegacy[]> => {
  logger.info("Fetching user tweets", { userRestID });
  const apiKey = rapidAPIKey.value();
  const url = `https://twitter135.p.rapidapi.com/v2/UserTweets/?id=${userRestID}&count=${maxTweets}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "twitter135.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = (await response.json()) as UserTweetRootObject | undefined;
    logger.info("Fetched user tweets", { result });

    const entries =
      result?.data?.user?.result?.timeline_v2?.timeline?.instructions?.find(
        (instruction) => instruction.type === "TimelineAddEntries"
      )?.entries;

    const tweets: ParsedTweetLegacy[] = [];
    if (entries && entries.length > 0) {
      for (const entry of entries.slice(0, maxTweets)) {
        const username =
          entry?.content?.itemContent?.tweet_results?.result?.core?.user_results
            ?.result?.legacy?.screen_name || "username";
        const item = entry?.content?.itemContent?.tweet_results?.result?.legacy;

        if (recentTimeMins && recentTimeMins > 0) {
          const createdAt = item?.created_at;
          // check if within the last 5 minutes
          if (!createdAt) {
            logger.debug("Tweet has no creation time", { item });
            continue;
          }
          const recentTimeThresholdMS = recentTimeMins * 60 * 1000;
          const shiftedAnchorTime = new Date(
            Date.now() - recentTimeThresholdMS
          );
          const createdDateTime = new Date(createdAt);
          if (isNaN(createdDateTime.getTime())) {
            logger.warn("Invalid date format", { createdAt });
            continue;
          }
          const isTweetTooOld = createdDateTime < shiftedAnchorTime;
          logger.info("Checking tweet creation time", {
            createdAt,
            shiftedAnchorTime,
            createdDateTime,
            isTweetTooOld,
          });
          if (isTweetTooOld) {
            const diffInMins = (Date.now() - createdDateTime.getTime()) / 60000;
            logger.debug("Tweet is older than 5 minutes", {
              createdAt,
              diffInMins,
            });
            continue;
          }
        }

        if (item && item.id_str && item.full_text && username) {
          const payload = {
            ...item,
            url: `https://x.com/${username}/status/${item.id_str}`,
            preview: item.full_text,
            userIdString: item.user_id_str || userRestID,
          };
          tweets.push(payload);
        }
      }
    }
    return tweets;
  } catch (error: any) {
    logger.error("An error occurred", {
      message: error?.message,
      stack: error?.stack,
      userRestID,
    });
    return [];
  }
};
