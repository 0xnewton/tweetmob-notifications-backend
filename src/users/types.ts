import { UnixTimestamp } from "../lib/types";

export type UserID = string;
export type TelegramUserID = number;

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: UnixTimestamp;
  updatedAt: UnixTimestamp;
  defaultWebhookURL: string | null;
  telegramUserID: number | null;
  telegramChatID: number | null;
  telegramUsername: string | null;
}
