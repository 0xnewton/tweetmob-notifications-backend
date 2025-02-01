import { Telegraf, Context } from "telegraf";
import { userService } from "../users/service";
import { logger } from "firebase-functions";
import { UserExistsError } from "../users/errors";
import { SubscriptionService } from "../subscriptions/service";
import { Subscription } from "../subscriptions/types";
import { formatXHandle, isValidXHandle, parseXHandle } from "../lib/x";
import { isValidURL } from "../lib/url";
import { ApiKeys } from "../apiKeys/service";
import { getUserFromContext } from "./utils";
import { FetchResult } from "../lib/types";
import { User } from "../users/types";

enum Commands {
  generate_api_key = "generate_api_key",
  subscribe = "subscribe",
  help = "help",
}

export const initializeBot = (apiKey: string) => {
  const bot = new Telegraf<Context>(apiKey);

  bot.start(async (ctx: Context) => {
    ctx.reply(
      "Welcome to the Tweetmob Notifications Bot! Use /help to see the available commands."
    );

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
      ctx.reply("Give me a moment while I set up your account...");
      await userService.createByTelegram({
        telegramUserID: userID,
        telegramUsername: userName,
        telegramChatID: chatID,
        makeAPIKey: false,
      });
    } catch (err) {
      if (err instanceof UserExistsError) {
        // User already exists
        logger.info("User already exists", { ctx });
        ctx.reply("Oh, I've seen you before. Welcome back!");
      } else {
        logger.error("Error creating user", { ctx, err });
        ctx.reply("Something went wrong. Please try again.");
      }
    }
  });

  bot.command(Commands.generate_api_key, async (ctx) => {
    logger.info("API key generation command received", { ctx });
    ctx.reply("Ok, generating a new API key... Please wait.");

    let user: FetchResult<User>;
    try {
      user = await getUserFromContext(ctx);
    } catch (err: any) {
      logger.error("Error fetching user", { ctx, err });
      ctx.reply(err?.message || "Something went wrong.");
      return;
    }

    try {
      const apiKey = await ApiKeys.create({ userID: user.data.id });
      ctx.reply(
        `Your API key is:\n\`${apiKey.key}\`\n\nKeep it safe! We will never show it to you again.`
      );
    } catch (err) {
      logger.error("Error creating API key", { ctx, err });
      ctx.reply("Something went wrong. Please try again.");
    }
    return;
  });

  bot.command(Commands.subscribe, async (ctx) => {
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

    ctx.reply("Ok, subscribing. Please give me a moment...");

    // const user = await userService.getByTelegramID(ctx.from.id);
    // logger.info("User details", { user });

    // if (!user) {
    //   logger.info("User not found", { ctx });
    //   ctx.reply("I can't find your account details. Please try again.");
    //   return;
    // }

    let user: FetchResult<User>;
    try {
      user = await getUserFromContext(ctx);
    } catch (err: any) {
      logger.error("Error fetching user", { ctx, err });
      ctx.reply(err?.message || "Something went wrong.");
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
      `Subscribed to ${fmtXHandle} successfully! You will receive notifications for new tweets.`
    );
  });

  bot.command(Commands.help, (ctx) => {
    ctx.reply(
      "Available commands:\n\n" +
        `/${Commands.generate_api_key} - Generate a new API key\n` +
        `/${Commands.subscribe} @xHandle https://your-webhook-url.com - Subscribe to a Twitter handle\n` +
        `/${Commands.help} - Show this help message`
    );
  });

  return bot;
};
