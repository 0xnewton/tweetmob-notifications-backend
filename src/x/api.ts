import { logger } from "firebase-functions";
import { rapidAPIKey } from "../lib/secrets";
import { batch } from "../lib/utils";
import { XUserID } from "../kols/types";
import {
  InternalTweetBundle,
  InternalTweetInterface,
  TwitterApiResponse,
} from "./types";

const DEFAULT_RECENT_TWEET_LIMIT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_TWEETS = 5;

export interface BatchFetchUserTweetsResponse {
  xUserID: XUserID;
  tweets: InternalTweetBundle[];
}
export const batchFetchUserTweets = async (
  userIDs: XUserID[],
  maxTweets = DEFAULT_MAX_TWEETS,
  recentTimeMS = DEFAULT_RECENT_TWEET_LIMIT_MS
): Promise<BatchFetchUserTweetsResponse[]> => {
  logger.info("Batch fetching user tweets", {
    userIDs,
    maxTweets,
    recentTimeMS,
    min: recentTimeMS / (1000 * 60),
  });
  if (userIDs.length === 0) {
    logger.warn("No user IDs provided");
    return [];
  }

  const userBatch = batch(userIDs, 5);
  const results: BatchFetchUserTweetsResponse[] = [];

  for (const [batchIndex, batch] of userBatch.entries()) {
    const start = Date.now();
    const promises = batch.map((xUserID) =>
      fetchUserTweets(xUserID, maxTweets, recentTimeMS)
    );
    const intermediateResults = await Promise.all(promises);

    results.push(
      ...intermediateResults.map((tweets, idx) => ({
        xUserID: batch[idx],
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
  xUserID: XUserID,
  maxTweets = DEFAULT_MAX_TWEETS,
  recentTimeMS = DEFAULT_RECENT_TWEET_LIMIT_MS
): Promise<InternalTweetBundle[]> => {
  logger.info("Fetching user tweets", { xUserID, maxTweets, recentTimeMS });
  const apiKey = rapidAPIKey.value();
  // const url = `https://twitter135.p.rapidapi.com/v2/UserTweets/?id=${xUserID}&count=${maxTweets}`;
  const url = `https://twitter-api45.p.rapidapi.com/timeline.php?screenname=foobar&rest_id=${xUserID}`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": apiKey,
      // "x-rapidapi-host": "twitter135.p.rapidapi.com",
      "x-rapidapi-host": "twitter-api45.p.rapidapi.com",
    },
  };

  try {
    const response = await fetch(url, options);
    const result = (await response.json()) as TwitterApiResponse | undefined;
    logger.info("Fetched user tweets from rapid api", { result });

    const tweets: InternalTweetBundle[] = [];

    for (const tweet of result?.timeline || []) {
      if (!tweet || !tweet.tweet_id || !tweet.author) {
        logger.debug("Invalid tweet data", { tweet });
        continue;
      }

      const createdAt = new Date(tweet.created_at);
      if (isNaN(createdAt.getTime())) {
        logger.warn("Invalid tweet creation date", { createdAt });
        continue;
      }

      if (recentTimeMS) {
        const shiftedAnchorTime = new Date(Date.now() - recentTimeMS);
        if (createdAt < shiftedAnchorTime) {
          logger.debug("Tweet is older than the recent time limit", {
            createdAt,
            shiftedAnchorTime,
          });
          continue;
        }
      }

      const internalTweet: InternalTweetInterface = {
        userId: tweet.author.rest_id,
        tweetId: tweet.tweet_id,
        text: tweet.text,
        createdAt: createdAt.toISOString(),
        lang: tweet.lang,
      };
      tweets.push({ data: internalTweet, raw: tweet });
    }

    // const entries =
    //   result?.data?.user?.result?.timeline_v2?.timeline?.instructions?.find(
    //     (instruction) => instruction.type === "TimelineAddEntries"
    //   )?.entries;

    // const tweets: ParsedTweetLegacy[] = [];
    // if (entries?.length) {
    //   for (const entry of entries.slice(0, maxTweets)) {
    //     const username =
    //       entry?.content?.itemContent?.tweet_results?.result?.core?.user_results
    //         ?.result?.legacy?.screen_name || "username";
    //     const item = entry?.content?.itemContent?.tweet_results?.result?.legacy;
    //     if (!item) {
    //       logger.debug("No tweet provided", { item, entry, username });
    //       continue;
    //     }

    //     if (recentTimeMS) {
    //       const createdAt = item?.created_at;
    //       // check if within the last 5 minutes
    //       if (!createdAt) {
    //         logger.debug("Tweet has no creation time", { item });
    //         continue;
    //       }
    //       const shiftedAnchorTime = new Date(Date.now() - recentTimeMS);
    //       const createdDateTime = new Date(createdAt);
    //       if (isNaN(createdDateTime.getTime())) {
    //         logger.warn("Invalid date format", { createdAt });
    //         continue;
    //       }
    //       const isTweetTooOld = createdDateTime < shiftedAnchorTime;
    //       logger.info("Checking tweet creation time", {
    //         createdAt,
    //         shiftedAnchorTime,
    //         createdDateTime,
    //         isTweetTooOld,
    //       });
    //       if (isTweetTooOld) {
    //         const diffInMins =
    //           (Date.now() - createdDateTime.getTime()) / (60 * 1000);
    //         logger.debug("Tweet is older than 5 minutes", {
    //           createdAt,
    //           diffInMins,
    //         });
    //         continue;
    //       }
    //     }

    //     if (
    //       item &&
    //       item.id_str &&
    //       item.full_text &&
    //       username &&
    //       item.user_id_str
    //     ) {
    //       const payload: ParsedTweetLegacy = {
    //         ...item,
    //         url: `https://x.com/${username}/status/${item.id_str}`,
    //         userIdString: item.user_id_str,
    //       };
    //       logger.info("Adding tweet", payload);
    //       tweets.push(payload);
    //     }
    //   }
    // }
    return tweets;
  } catch (error: any) {
    logger.error("An error occurred", {
      message: error?.message,
      stack: error?.stack,
      xUserID,
    });
    return [];
  }
};
