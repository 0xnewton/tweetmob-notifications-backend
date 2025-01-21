import { Telegraf, Context } from "telegraf";
import { UserService } from "../users/service";
import { logger } from "firebase-functions";
import { UserExistsError } from "../users/errors";

interface SessionData extends Context {
  // your custom session fields...
}

export const initializeBot = (apiKey: string) => {
  const bot = new Telegraf<SessionData>(apiKey);

  bot.start(async (ctx: SessionData) => {
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

  bot.command("subscribe", async (ctx) => {
    logger.info("Subscribe command received", { ctx });

    if (!ctx.from) {
      logger.info("Unable to retrieve user details", { ctx });
      ctx.reply("Unable to retrieve your user details. Please try again.");
      return;
    }

    const user = await UserService.getByTelegramID(ctx.from.id);
    logger.info("User details", { user });

    if (!user) {
      logger.info("User not found", { ctx });
      ctx.reply("User not found. Please try again.");
      return;
    }

    ctx.reply("Subscribe command received");
  });

  return bot;
};
