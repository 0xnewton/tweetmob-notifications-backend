import { Context } from "telegraf";
import { User } from "../users/types";
import { logger } from "firebase-functions";
import { userService } from "../users/service";
import { FetchResult } from "../lib/types";
import { TGUserNotFoundError } from "../users/errors";

export const UNREGISTERED_USER_MESSAGE =
  "You are not registered. Please use /start to register before running this command.";

export const getUserFromContext = async (
  context: Context
): Promise<FetchResult<User>> => {
  logger.info("Fetching user from context", { context });

  if (!context.from) {
    logger.info("Unable to retrieve user details", { context });
    throw new Error("Unable to retrieve your user details. Please try again.");
  }

  let user: FetchResult<User> | null = null;
  try {
    user = await userService.getByTelegramID(context.from.id);
  } catch (err) {
    logger.error("Error fetching user", { context, err });
    throw new Error("Something went wrong. Please try again.");
  }

  if (!user) {
    logger.info("User not found", { context });
    throw new TGUserNotFoundError("User not found", context.from.id);
  }

  logger.info("User details", { user });

  return user;
};
