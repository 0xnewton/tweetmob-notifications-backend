import { DocumentReference } from "firebase-admin/firestore";
import { KOL, KOLID, XHandle } from "../kols/types";
import { ParsedTweetLegacy } from "../x/types";

export type UnixTimestamp = number;

export enum DBCollections {
  Users = "Users",
  APIKeys = "APIKeys",
  Subscriptions = "Subscriptions",
  Tweets = "Tweets",
  KOLs = "KOLs",
  UserNotificationsSeen = "UserNotificationsSeen",
}

export type FetchResult<T> = {
  data: T;
  ref: DocumentReference<T>;
};

export interface UserTweet {
  user: KOL;
  tweet: ParsedTweetLegacy;
}

export interface WebhookPayload {
  tweet: ParsedTweetLegacy;
  user: {
    id: KOLID;
    xHandle: XHandle;
    xUserID: number | null;
    xUserIDStr: string | null;
    xScreenName: string | null;
    xName: string | null;
  };
}
