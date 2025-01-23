import { UnixTimestamp } from "../lib/types";
import { KOLID, XHandle } from "../kols/types";
import { UserID } from "../users/types";

export type SubscriptionID = string;

export enum SubscriptionStatus {
  Active = "active",
  Pending = "pending",
  Deleted = "deleted",
}

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
}
