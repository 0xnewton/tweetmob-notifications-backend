import { UnixTimestamp } from "../lib/types";
import { UserID } from "../users/types";
import { InternalTweetInterface, TweetFromXApi } from "../x/types";

export type KOLID = string;
export type XHandle = string;
export type TweetID = string;
export type XUserID = string;

export enum KOLStatus {
  Active = "active",
  Pending = "pending",
  Deleted = "deleted",
}

export interface XKOLSnapshot {
  xUserID: string;
  xScreenName: string;
  xName: string;
  updatedAt: number; // unix timestamp
}

export interface KOL {
  id: KOLID;
  xHandle: XHandle;
  xUserID: XUserID | null; // Only filled in on first notification (this is the rest_id from rapid api)
  xScreenName: string | null;
  xName: string | null;
  status: KOLStatus;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
  deletedAt: UnixTimestamp | null;
  createdBy: UserID;
  lastPostSeenAt: UnixTimestamp | null;
  xUpdates: XKOLSnapshot[] | null;
  metadata: Record<string, string> | null;
}

// Subcollection under the KOL
export interface Tweet {
  id: TweetID;
  kolID: KOLID;
  tweet: InternalTweetInterface;
  rawTweet: TweetFromXApi;
  createdAt: UnixTimestamp;
}
