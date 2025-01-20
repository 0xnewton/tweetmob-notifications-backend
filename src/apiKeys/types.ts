import { UnixTimestamp } from "../lib/types";

export type APIKeyID = string;

export interface APIKey {
  id: APIKeyID;
  hash: string;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
}
