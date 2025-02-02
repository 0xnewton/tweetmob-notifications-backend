import { KOLID, XHandle } from "../kols/types";
import { UnixTimestamp } from "../lib/types";
import {
  SubscriptionAPIMetadata,
  SubscriptionID,
  SubscriptionStatus,
} from "../subscriptions/types";
import { User, UserID } from "../users/types";
import { Request, Response, NextFunction } from "express";

export interface APIRequest extends Request {
  user?: User;
}

export type APIResponse = Response;
export type APINextFunction = NextFunction;

export interface SubscriptionV1 {
  id: SubscriptionID;
  kolID: KOLID;
  xHandle: XHandle;
  createdBy: UserID;
  webhookURL: string;
  status: SubscriptionStatus;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
  apiMetadata: SubscriptionAPIMetadata | null;
}
