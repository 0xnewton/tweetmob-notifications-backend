import { UnixTimestamp } from "../lib/types";
import { UserID } from "../users/types";

export type KOLID = string;
export type XHandle = string;

export enum KOLStatus {
  Active = "active",
  Pending = "pending",
  Deleted = "deleted",
}

export interface KOL {
  id: KOLID;
  xHandle: XHandle;
  status: KOLStatus;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
  deletedAt: UnixTimestamp | null;
  createdBy: UserID;
}
