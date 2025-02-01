import { Context } from "telegraf";
import { User } from "../users/types";
import { logger } from "firebase-functions";
import { userService } from "../users/service";
import { FetchResult } from "../lib/types";

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
    throw new Error(
      "User not found. Please try again or run the /start command."
    );
  }

  logger.info("User details", { user });

  return user;
};
