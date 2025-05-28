import { logger } from "firebase-functions";
import { XNotification, XNotificationItem, XTweet, XUser } from "../types";
import { KOL, KOLID, KOLStatus, XHandle, XKOLSnapshot } from "../../kols/types";
import {
  batchUpdateTweetsAndKOLs,
  BatchUpdateTweetsAndKOLsParams,
  bulkFetchKOLsByHandle,
} from "../../kols/api";
import { parseXHandle } from "../../lib/x";
import { FieldValue, UpdateData } from "firebase-admin/firestore";
import {
  batchFetchUserTweets,
  BatchFetchUserTweetsResponse,
} from "../../x/api";
import { SubscriptionService } from "../../subscriptions/service";
import { UserTweet } from "../../lib/types";
import { writeWebhookReceipts } from "../../subscriptions/service/writeWebhookReceipts";
import { InternalTweetBundle } from "../../x/types";

const IGNORE_NOTIFICATIONS_YOUNGER_THAN_MS = 4 * 60 * 1000; // 4 minutes

interface ReceiveNotificationParams {
  data: XNotification;
}
interface ParsedNotification {
  users: XUser[];
  tweets: XTweet[];
  notifications: XNotificationItem[];
}

export const receiveNotification = async (
  params: ReceiveNotificationParams
) => {
  logger.info("Receive notification service request hit", { params });
  const parsedData = extractUsersFromNotifcation(params.data);
  if (parsedData.users.length === 0) {
    logger.info("No user notifications found", { data: params.data });
    return;
  }
  await processNotification(parsedData);
};

const extractUsersFromNotifcation = (
  data: XNotification
): ParsedNotification => {
  const users = data.globalObjects.users || {};
  const tweets = Object.values(data.globalObjects.tweets || {});
  const notifications = Object.values(data.globalObjects.notifications || {});

  const newPostNotifications = notifications.filter((notification) => {
    return notification?.message?.text?.includes("New post notifications for");
  });

  const allUsers: XUser[] = [];
  for (const notification of newPostNotifications) {
    // const notifTitle = notification.message.text;
    const usersInNotif =
      notification.template?.aggregateUserActionsV1?.fromUsers?.map(
        (n) => n?.user?.id
      );
    logger.info("Found kols in notification", { usersInNotif });
    usersInNotif?.forEach((id) => {
      const user = users[id];
      const existingUserInArray = allUsers.find((u) => u.id === user.id);
      if (user && !existingUserInArray) {
        allUsers.push(user);
      }
    });
  }

  const result = {
    users: allUsers,
    tweets,
    notifications,
  };

  logger.info("Extracted data from notification", { result });

  return result;
};

const processNotification = async (data: ParsedNotification) => {
  logger.info("Processing notification", { data });
  const handleToKOLDict: Record<XHandle, KOL> = {};
  const handleToXUserDict: Record<XHandle, XUser> = {};
  const xHandles = [...new Set(data.users.map(genXUserHandle))];
  logger.info("All x handles to fetch", { xHandles });
  const allKOLs = await bulkFetchKOLsByHandle(xHandles);
  if (allKOLs.length === 0) {
    logger.info("No KOLs found for x handles", { xHandles });
    return;
  }
  const kolsToProcess = allKOLs.filter(
    (data) => validateKOLLastPostSeen(data.data) && !data.data.deletedAt
  );

  if (kolsToProcess.length === 0) {
    logger.info("No KOLs to process -- all rejected from lastPostSeenTime", {
      kolsToProcess,
    });
    return;
  }

  kolsToProcess.forEach((dupe) => {
    handleToKOLDict[dupe.data.xHandle] = dupe.data;
  });
  data.users.forEach((user) => {
    const handle = genXUserHandle(user);
    handleToXUserDict[handle] = user;
  });

  const kolUpdateRequests = extractKOLsFromUsers(data.users, handleToKOLDict);
  logger.info("Fetched existing KOLs", {
    existingKOLs: kolsToProcess.map((kol) => kol.data),
  });
  const kolsToProcessIDs = kolsToProcess
    .map((kol) => kol.data.xUserIDStr)
    .filter((id): id is string => !!id);
  const kolTweets = await batchFetchUserTweets(kolsToProcessIDs);
  logger.info("Fetched user tweets", {
    kolTweets,
    users: data.users,
    kolUserIDStrs: kolsToProcessIDs,
  });
  const filteredKOLTweets = kolTweets.filter((p) => p.tweets?.length);
  if (filteredKOLTweets.length === 0) {
    logger.debug("No tweets fetched", { filteredKOLTweets });
    return;
  }

  const userMostRecentTweets = extractUserTweets(
    filteredKOLTweets,
    data.users,
    handleToKOLDict
  );

  const augmenteUserMostRecentTweets = augmentUserTweetsWithKOLData(
    userMostRecentTweets,
    handleToXUserDict
  );

  if (augmenteUserMostRecentTweets.length === 0) {
    logger.info("No user tweets to process", { userMostRecentTweets });
    return;
  }

  // Hit subscription webhooks - this is the most vital & time sensitive part
  const webhooksResult = await SubscriptionService.hitWebhooks(
    augmenteUserMostRecentTweets
  );

  // Augment with kol ids + tweets
  const augmentedKOLUpdateData: BatchUpdateTweetsAndKOLsParams[] = [];
  for (const userTweet of augmenteUserMostRecentTweets) {
    const kol = userTweet.user;
    const tweet = userTweet.tweet;
    const kolID = kol.id;
    const payload: BatchUpdateTweetsAndKOLsParams = {
      id: kolID,
      tweet,
    };
    const kolUpdateRequest = kolUpdateRequests.find(
      (k) => k.id === kolID
    )?.payload;
    if (kolUpdateRequest) {
      payload.kolPayload = { ...kolUpdateRequest };
    }
    augmentedKOLUpdateData.push(payload);
  }

  // Data integrity
  await Promise.allSettled([
    // Update KOL lastPostSeenAt, xdata etc & add the tweets to kol subcollection
    batchUpdateTweetsAndKOLs(augmentedKOLUpdateData),
    // Write webhook receipts for billing & auto activate subscriptions if pending
    writeWebhookReceipts(webhooksResult),
  ]);

  return;
};

const genXUserHandle = (user: XUser): XHandle => {
  return parseXHandle(user.screen_name);
};

const constructKOLUpdatePayload = (kol: KOL, xUser: XUser): UpdateData<KOL> => {
  const result: UpdateData<KOL> = {
    lastPostSeenAt: Date.now(),
  };
  if (kol.status === KOLStatus.Pending) {
    result.status = KOLStatus.Active;
  }

  if (kol.xUserID !== xUser.id) {
    result.xUserID = xUser.id;
    result.xUserIDStr = xUser.id_str;
    result.xScreenName = xUser.screen_name;
    result.xName = xUser.name;
    // Store updates just in case something fucks up
    const xUpdate: XKOLSnapshot = {
      xUserID: xUser.id,
      xUserIDStr: xUser.id_str,
      xScreenName: xUser.screen_name,
      xName: xUser.name,
      updatedAt: Date.now(),
    };
    result.xUpdates = FieldValue.arrayUnion(xUpdate);
  }

  return result;
};

const validateKOLLastPostSeen = (kol: KOL): boolean => {
  if (kol.lastPostSeenAt) {
    const timeDiffMS = Date.now() - kol.lastPostSeenAt;
    // ignore if over 120 seconds recently (duplicate)
    if (timeDiffMS > IGNORE_NOTIFICATIONS_YOUNGER_THAN_MS) {
      logger.info("Valid recent post for kol", {
        kol: kol,
        screenName: kol.xScreenName,
        timeDiffMS,
      });

      return true;
    } else {
      // Skipping duplicate post
      logger.debug("Skipping duplicate user", {
        screenName: kol.xScreenName,
        timeDiffMS,
      });
      return false;
    }
  }
  return true;
};

const extractKOLsFromUsers = (
  users: XUser[],
  handleToKOLDict: Record<XHandle, KOL>
) => {
  const kolsToUpdate: { id: KOLID; payload: UpdateData<KOL> }[] = []; // Update kols with last post time & any additional data like id_str from twitter etc
  for (const user of users) {
    const handle = genXUserHandle(user);
    const recentKOLData = handleToKOLDict[handle];
    if (!recentKOLData) {
      logger.warn("No recent KOL data or XUser data", {
        kol: recentKOLData ?? null,
        user,
      });
      continue;
    }
    const payload = constructKOLUpdatePayload(recentKOLData, user);
    if (validateKOLLastPostSeen(recentKOLData)) {
      kolsToUpdate.push({
        id: recentKOLData.id,
        payload,
      });
    }
  }
  return kolsToUpdate;
};

const extractUserTweets = (
  userTweets: BatchFetchUserTweetsResponse[],
  xUsers: XUser[],
  handleToKOLDict: Record<XHandle, KOL>
) => {
  const userMostRecentTweets: UserTweet[] = userTweets
    .map((t) => {
      const maxCreatedTime = Math.max(
        ...t.tweets.map((tweet) =>
          !tweet.data.createdAt ? 0 : new Date(tweet.data.createdAt).getTime()
        )
      );
      const mostRecentTweet = t.tweets.find(
        (tweet) =>
          tweet.data.createdAt &&
          new Date(tweet.data.createdAt).getTime() === maxCreatedTime
      );
      const xUser = xUsers.find((u) => u.id_str === t.xUserIDStr);
      if (!xUser) {
        logger.error("No user found for tweet", { tweet: t });
        return null;
      }
      const handle = genXUserHandle(xUser);
      const userKOL = handleToKOLDict[handle];
      if (!handle || !userKOL) {
        logger.debug("No KOL found for user", { user: xUser });
        return null;
      }
      return { user: userKOL, tweet: mostRecentTweet || t.tweets[0] };
    })
    .filter((a): a is UserTweet => !!a);

  return userMostRecentTweets;
};

const augmentUserTweetsWithKOLData = (
  userMostRecentTweets: UserTweet[],
  handleToXUserDict: Record<XHandle, XUser>
): {
  user: KOL;
  tweet: InternalTweetBundle;
}[] => {
  const augmenteUserMostRecentTweets = userMostRecentTweets.map((ut) => {
    // For example, if KOL hasnt been updated yet, we fill in the data here
    const userClone = {
      ...ut.user,
    };
    if (!userClone.xUserID) {
      const xUser = handleToXUserDict[ut.user.xHandle];
      if (xUser) {
        const tempKOLUpdateData = constructKOLUpdatePayload(ut.user, xUser);
        if (tempKOLUpdateData.xUserID) {
          userClone.xUserID = tempKOLUpdateData.xUserID as number;
          userClone.xUserIDStr = tempKOLUpdateData.xUserIDStr as string;
          userClone.xScreenName = tempKOLUpdateData.xScreenName as string;
          userClone.xName = tempKOLUpdateData.xName as string;
        }
      }
    }
    return { user: userClone, tweet: ut.tweet };
  });

  return augmenteUserMostRecentTweets;
};
