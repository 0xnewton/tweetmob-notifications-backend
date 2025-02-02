import { UnixTimestamp, WebhookPayload } from "../lib/types";
import { KOLID, XHandle } from "../kols/types";
import { UserID } from "../users/types";

export type SubscriptionID = string;
export type WehbookReceiptID = string;

export enum SubscriptionStatus {
  Active = "active",
  Pending = "pending",
  Deleted = "deleted",
}

export type SubscriptionAPIMetadata = Record<string, number | string>;

export interface Subscription {
  id: SubscriptionID;
  kolID: KOLID;
  xHandle: XHandle;
  createdBy: UserID;
  webhookURL: string;
  status: SubscriptionStatus;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
  deletedAt: UnixTimestamp | null;
  apiMetadata: SubscriptionAPIMetadata | null;
}

export interface WebhookResponseData {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
}

export interface ResponseError {
  message: string;
}

export interface Receipt {
  id: WehbookReceiptID;
  subscriptionID: SubscriptionID;
  kolID: KOLID;
  userID: UserID;
  response: WebhookResponseData | null;
  url: string;
  error: ResponseError | null;
  webhookPayload: WebhookPayload;
  webhookHitAt: UnixTimestamp;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
  deletedAt: UnixTimestamp | null;
}
