import { APIKey } from "../../apiKeys/types";
import { createUser, getUserByTelegramUserID } from "../api";
import { TelegramUserID, User } from "../types";
import { ApiKeys } from "../../apiKeys/service";
import { FetchResult } from "../../lib/types";
import { logger } from "firebase-functions";
import { UserExistsError } from "../errors";

interface CreateUserParams {
  telegramUserID: TelegramUserID;
  telegramUsername: string;
  telegramChatID: string;
}

export interface CreateUserResponse {
  user: FetchResult<User>;
  apiKey: FetchResult<APIKey>;
}

export const createByTelegram = async (
  params: CreateUserParams
): Promise<CreateUserResponse> => {
  logger.info("Create user service request hit", { params });
  const existingUser = await getUserByTelegramUserID(params.telegramUserID);

  if (existingUser) {
    logger.error("User already exists", { params });
    throw new UserExistsError("User already exists", existingUser.data);
  }

  // Create user
  const user = await createUser({
    telegramUserID: params.telegramUserID,
    telegramUsername: params.telegramUsername,
    telegramChatID: params.telegramChatID,
    email: null,
    name: null,
    defaultWebhookURL: null,
  });

  // Create API Key
  const apiKey = await ApiKeys.create({ userID: user.data.id });

  return {
    user,
    apiKey,
  };
};
