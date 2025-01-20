import { UnixTimestamp } from "../lib/types";

export type UserID = string;
export type TelegramUserID = string;

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
  defaultWebhookURL: string | null;
  telegramUserID: string | null;
  telegramChatID: string | null;
  telegramUsername: string | null;
}
