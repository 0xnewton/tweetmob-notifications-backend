import { Telegraf } from "telegraf";
import { UserService } from "../users/service";
import { logger } from "firebase-functions";
import { UserExistsError } from "../users/errors";

export const initializeBot = (apiKey: string) => {
  const bot = new Telegraf(apiKey);

  bot.start(async (ctx) => {
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
      const { rawAPIKey } = await UserService.createByTelegram({
        telegramUserID: userID,
        telegramUsername: userName,
        telegramChatID: chatID,
      });
      ctx.reply(
        `Welcome! Your API key is:\n\`${rawAPIKey}\`\n\nKeep it safe! We will never show it to you again.`
      );
    } catch (err) {
      if (err instanceof UserExistsError) {
        // User already exists
        logger.info("User already exists", { ctx });
        ctx.reply("Welcome back!");
      }
    }
  });

  return bot;
};
