import { APIKey } from "../../apiKeys/types";
import { createUser, getUserByTelegramUserID } from "../api";
import { TelegramUserID, User } from "../types";
import { ApiKeys } from "../../apiKeys/service";
import { FetchResult } from "../../lib/types";
import { logger } from "firebase-functions";
import { UserExistsError } from "../errors";
import { CreateAPIKeyResponse } from "../../apiKeys/service/create";
import { Context } from "telegraf";

interface CreateUserParams {
  telegramUserID: TelegramUserID;
  telegramUsername: string;
  telegramChatID: number;
  makeAPIKey?: boolean;
}

export interface CreateUserResponse {
  user: FetchResult<User>;
  apiKey?: FetchResult<APIKey>;
  rawAPIKey?: string;
}

export const createByTelegram = async (
  params: CreateUserParams,
  context: { tgContext?: Context }
): Promise<CreateUserResponse> => {
  logger.info("Create user service request hit", { params });
  const existingUser = await getUserByTelegramUserID(params.telegramUserID);

  if (existingUser) {
    logger.debug("User already exists", { params });
    throw new UserExistsError("User already exists", existingUser.data);
  }

  if (context.tgContext) {
    context.tgContext.reply("Give me a moment while I set up your account...");
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
  let apiKey: CreateAPIKeyResponse | null = null;
  if (params.makeAPIKey) {
    if (context.tgContext) {
      context.tgContext.reply("Now I'll generate you an API key...");
    }
    apiKey = await ApiKeys.create({ userID: user.data.id });
  }

  return {
    user,
    apiKey: apiKey?.stored,
    rawAPIKey: apiKey?.key,
  };
};
