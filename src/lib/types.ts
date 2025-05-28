import { DocumentReference } from "firebase-admin/firestore";
import { KOL, KOLID, XHandle } from "../kols/types";
import { InternalTweetBundle } from "../x/types";

export type UnixTimestamp = number;

export enum DBCollections {
  Users = "Users",
  APIKeys = "APIKeys",
  Subscriptions = "Subscriptions",
  Tweets = "Tweets",
  KOLs = "KOLs",
  Receipts = "Receipts",
}

export type FetchResult<T> = {
  data: T;
  ref: DocumentReference<T>;
};

export interface UserTweet {
  user: KOL;
  tweet: InternalTweetBundle;
}

export interface WebhookPayload {
  tweet: InternalTweetBundle;
  user: {
    id: KOLID;
    xHandle: XHandle;
    xUserID: string | null;
    xScreenName: string | null;
    xName: string | null;
  };
}

export type PaginatedResults<T> = {
  data: T[];
  cursor: string | null;
  hasNextPage: boolean;
  limit: number;
};
