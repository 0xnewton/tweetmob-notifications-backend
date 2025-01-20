import { logger } from "firebase-functions";
import { usersCollection } from "../lib/refs";
import { FetchResult } from "../lib/types";
import { TelegramUserID, User } from "./types";

export const getUserByTelegramUserID = async (
  tgUserID: TelegramUserID
): Promise<FetchResult<User> | null> => {
  logger.info("Fetching user by telegram user id", { tgUserID });
  const key: keyof User = "telegramUserID";
  const user = await usersCollection().where(key, "==", tgUserID).get();
  const docs = user.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });
  return docs[0] || null;
};

interface CreateUserParams {
  telegramUserID: TelegramUserID;
  telegramUsername: string;
  telegramChatID: string;
  email: string | null;
  name: string | null;
  defaultWebhookURL: string | null;
}
export const createUser = async (
  params: CreateUserParams
): Promise<FetchResult<User>> => {
  logger.info("Creating user", { params });
  const docRef = usersCollection().doc();
  const body: User = {
    id: docRef.id,
    email: params.email,
    name: params.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    defaultWebhookURL: params.defaultWebhookURL,
    telegramUserID: params.telegramUserID,
    telegramChatID: params.telegramChatID,
    telegramUsername: params.telegramUsername,
  };

  await docRef.create(body);

  return { data: body, ref: docRef };
};
