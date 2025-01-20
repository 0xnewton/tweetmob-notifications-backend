import { DocumentReference } from "firebase-admin/firestore";

export type UnixTimestamp = number;

export enum DBCollections {
  Users = "Users",
  APIKeys = "APIKeys",
  Subscriptions = "Subscriptions",
  Tweets = "Tweets",
  KOLs = "KOLs",
}

export type FetchResult<T> = {
  data: T;
  ref: DocumentReference<T>;
};
