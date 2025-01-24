import { logger } from "firebase-functions";
import { XNotification, XNotificationItem, XTweet, XUser } from "../types";
import { KOL, KOLID, KOLStatus, XHandle, XKOLSnapshot } from "../../kols/types";
import { batchUpdateKOLs, bulkFetchKOLsByHandle } from "../../kols/api";
import { parseXHandle } from "../../lib/x";
import { FieldValue, UpdateData } from "firebase-admin/firestore";

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

  const newPostNotifications = notifications.filter((notification: any) => {
    // console.log(notification);
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
      // console.log(`notifTitle="${notifTitle}, includes=${user.name}", bool=${notifTitle.includes(user.name)}`)
      if (user && notifTitle.includes(user.name)) {
        allUsers.push(user);
      }
    });
  }

  const result = {
    users: allUsers,
    tweets,
    notifications,
  };

  logger.info("Extracted data from notifiation", { result });

  return result;
};

const processNotification = async (data: ParsedNotification) => {
  const handleToKOLDict: Record<XHandle, KOL> = {};
  const handleToXUserDict: Record<XHandle, XUser> = {};
  const xHandles = [...new Set(data.users.map(genXUserHandle))];
  const existingKOLs = await bulkFetchKOLsByHandle(xHandles);
  existingKOLs.forEach((dupe) => {
    handleToKOLDict[dupe.data.id] = dupe.data;
  });
  data.users.forEach((user) => {
    const handle = genXUserHandle(user);
    handleToXUserDict[handle] = user;
  });
  const kolsToUpdate: { id: KOLID; payload: UpdateData<KOL> }[] = []; // Update kols with last post time & any additional data like id_str from twitter etc
  for (const user of data.users) {
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
      if (timeDiffMS > 1000 * 120) {
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

  await batchUpdateKOLs(kolsToUpdate);

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
