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

const IGNORE_NOTIFICATIONS_OLDER_THAN_SEC = 120;

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
    const notifTitle = notification.message.text;
    const usersInNotif =
      notification.template?.aggregateUserActionsV1?.fromUsers?.map(
        (n) => n?.user?.id
      );
    logger.info("Found kols in notification", { usersInNotif });
    usersInNotif?.forEach((id) => {
      const user = users[id];
      const existingUserInArray = allUsers.find((u) => u.id === user.id);
      if (user && notifTitle.includes(user.name) && !existingUserInArray) {
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
  const userIDsToFetch = data.users.map((u) => u.id_str);
  const [existingKOLs, userTweets] = await Promise.all([
    bulkFetchKOLsByHandle(xHandles),
    batchFetchUserTweets(userIDsToFetch),
  ]);
  logger.info("Fetched user tweets", { userTweets, users: data.users });

  existingKOLs.forEach((dupe) => {
    handleToKOLDict[dupe.data.id] = dupe.data;
  });
  data.users.forEach((user) => {
    const handle = genXUserHandle(user);
    handleToXUserDict[handle] = user;
  });
  const kolsToUpdate = extractKOLsFromUsers(data.users, handleToKOLDict);
  const userMostRecentTweets = extractUserMostRecentTweets(
    userTweets,
    data.users,
    handleToKOLDict
  );

  const augmenteUserMostRecentTweets = augmentUserTweetsWithKOLData(
    userMostRecentTweets,
    handleToXUserDict
  );

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
      tweet: {
        xApiResponse: { ...tweet },
      },
    };
    const kolToUpdate = kolsToUpdate.find((k) => k.id === kolID)?.payload;
    if (kolToUpdate) {
      payload.kolPayload = { ...kolToUpdate };
    }
    augmentedKOLUpdateData.push(payload);
  }

  // Data integrity
  await Promise.all([
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
    if (recentKOLData.lastPostSeenAt) {
      const timeDiffMS = Date.now() - recentKOLData.lastPostSeenAt;
      // ignore if over 120 seconds recently (duplicate)
      if (timeDiffMS > 1000 * IGNORE_NOTIFICATIONS_OLDER_THAN_SEC) {
        logger.info("Valid recent post for user", {
          user,
          kol: recentKOLData,
          screenName: user.screen_name,
          timeDiffMS,
        });
        // valid recent post, not duplicate
        // update timestamp
        kolsToUpdate.push({
          id: recentKOLData.id,
          payload,
        });
      } else {
        // Skipping duplicate user
        logger.debug("Skipping duplicate user", {
          screenName: user.screen_name,
          timeDiffMS,
        });
      }
    } else {
      kolsToUpdate.push({
        id: recentKOLData.id,
        payload,
      });
    }
  }
  return kolsToUpdate;
};

const extractUserMostRecentTweets = (
  userTweets: BatchFetchUserTweetsResponse[],
  xUsers: XUser[],
  handleToKOLDict: Record<XHandle, KOL>
) => {
  const userMostRecentTweets: UserTweet[] = userTweets
    .map((t) => {
      const maxCreatedTime = Math.max(
        ...t.tweets.map((tweet) =>
          !tweet.created_at ? 0 : new Date(tweet.created_at).getTime()
        )
      );
      const mostRecentTweet = t.tweets.find(
        (tweet) =>
          tweet.created_at &&
          new Date(tweet.created_at).getTime() === maxCreatedTime
      );
      const xUser = xUsers.find((u) => u.id_str === t.userID);
      if (!xUser) {
        logger.error("No user found for tweet", { tweet: t });
        return null;
      }
      const handle = genXUserHandle(xUser);
      const userKOL = handleToKOLDict[handle];
      if (!handle || !userKOL) {
        logger.error("No KOL found for user", { user: xUser });
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
) => {
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
