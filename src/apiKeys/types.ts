import { UnixTimestamp } from "../lib/types";
import { UserID } from "../users/types";

export type APIKeyID = string;

export interface APIKey {
  id: APIKeyID;
  hash: string;
  createdBy: UserID;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
}
