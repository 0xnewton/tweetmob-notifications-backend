import { logger } from "firebase-functions";
import { Context } from "telegraf";
import { userService } from "../../users/service";
import { UserExistsError } from "../../users/errors";

export const start = async (ctx: Context) => {
  ctx.reply("Welcome to the Tweetmob Notifications Bot!");

  logger.info("Start command received", { ctx });
  const userID = ctx.from?.id;
  const userName = ctx.from?.username;
  const chatID = ctx.chat?.id;

  if (!userID || !userName || !chatID) {
    logger.info("Unable to retrieve user details", { ctx });
    ctx.reply("Unable to retrieve your user details. Please try again.");
    return;
  }

  // Check if user exists
  try {
    await userService.createByTelegram(
      {
        telegramUserID: userID,
        telegramUsername: userName,
        telegramChatID: chatID,
        makeAPIKey: false,
      },
      { tgContext: ctx }
    );
  } catch (err) {
    if (err instanceof UserExistsError) {
      // User already exists
      logger.info("User already exists", { ctx });
    } else {
      logger.error("Error creating user", { ctx, err });
      ctx.reply("Something went wrong. Please try again.");
    }
    return;
  }

  ctx.reply("Your account has been set up successfully!");
};
