import { logger } from "firebase-functions";
import { userDocument, usersCollection } from "../lib/refs";
import { FetchResult } from "../lib/types";
import { TelegramUserID, User, UserID } from "./types";

export const getUserByID = async (
  userID: UserID
): Promise<FetchResult<User> | null> => {
  logger.info("Fetching user by user id", { userID });
  const user = await userDocument(userID).get();
  const data = user.data();
  if (!user.exists || !data) {
    return null;
  }
  return { data, ref: user.ref };
};

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
  telegramChatID: number;
  email: string | null;
  name: string | null;
  defaultWebhookURL: string | null;
}
export const createUser = async (
  params: CreateUserParams
): Promise<FetchResult<User>> => {
  // Make sure not user exists
  const existingUser = await getUserByTelegramUserID(params.telegramUserID);
  if (existingUser) {
    logger.error("User already exists", { params });
    throw new Error("User already exists");
  }

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
