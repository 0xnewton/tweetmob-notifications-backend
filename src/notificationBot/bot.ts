import { Telegraf, Context } from "telegraf";
import { userService } from "../users/service";
import { logger } from "firebase-functions";
import { UserExistsError } from "../users/errors";
import { SubscriptionService } from "../subscriptions/service";
import { Subscription, SubscriptionStatus } from "../subscriptions/types";
import { formatXHandle, isValidXHandle, parseXHandle } from "../lib/x";
import { isValidURL } from "../lib/url";

type SessionData = Context;

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
      const { rawAPIKey } = await userService.createByTelegram({
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
      } else {
        logger.error("Error creating user", { ctx, err });
        ctx.reply("Something went wrong. Please try again.");
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

    const args = ctx.message.text.split(" ").slice(1); // Extract arguments from the command
    if (args.length < 2) {
      ctx.reply(
        "Invalid usage. Please provide an X handle and a webhook URL.\nExample: /subscribe @xHandle https://your-webhook-url.com"
      );
      return;
    }

    let [xHandle, webhookURL] = args;
    logger.info("Subscribe command arguments", { xHandle, webhookURL });
    xHandle = parseXHandle(xHandle);
    if (!isValidXHandle(xHandle)) {
      ctx.reply("Invalid X handle. Please provide a valid Twitter handle.");
      return;
    }

    if (!webhookURL.startsWith("http")) {
      webhookURL = `https://${webhookURL}`;
    }

    if (!isValidURL(webhookURL)) {
      ctx.reply("Invalid webhook URL. Please provide a valid URL.");
      return;
    }

    const user = await userService.getByTelegramID(ctx.from.id);
    logger.info("User details", { user });

    if (!user) {
      logger.info("User not found", { ctx });
      ctx.reply("User not found. Please try again.");
      return;
    }

    let subscription: Subscription;
    try {
      const subscriptionResult = await SubscriptionService.create(
        {
          webhookURL,
          xHandle,
        },
        { user: user.data }
      );
      subscription = subscriptionResult.data;
    } catch (err) {
      logger.error("Error creating subscription", { ctx, err });
      ctx.reply("Something went wrong. Please try again.");
      return;
    }

    const fmtXHandle = formatXHandle(subscription.xHandle);

    ctx.reply(
      `Subscribed successfully! You will receive POST requests at ${subscription.webhookURL} when ${fmtXHandle} posts a new message${
        subscription.status === SubscriptionStatus.Active
          ? "."
          : " and your subscription becomes active (usually within 24 hours)."
      }`
    );
  });

  return bot;
};
