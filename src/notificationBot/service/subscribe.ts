import { logger } from "firebase-functions";
import { Context } from "telegraf";
import { formatXHandle, isValidXHandle, parseXHandle } from "../../lib/x";
import { isValidURL } from "../../lib/url";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import { getUserFromContext, UNREGISTERED_USER_MESSAGE } from "../utils";
import { SubscriptionExistsError } from "../../subscriptions/errors";
import { SubscriptionService } from "../../subscriptions/service";
import { Subscription } from "../../subscriptions/types";
import { TGUserNotFoundError } from "../../users/errors";

export const subscribe = async (message: string, ctx: Context) => {
  logger.info("Subscribe command received", { ctx });

  if (!ctx.from) {
    logger.info("Unable to retrieve user details", { ctx });
    ctx.reply("Unable to retrieve your user details. Please try again.");
    return;
  }

  const args = message.split(" ").slice(1); // Extract arguments from the command
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

  ctx.reply("Looks great! Give me a moment to set things up...");

  let user: FetchResult<User>;
  try {
    user = await getUserFromContext(ctx);
  } catch (err: any) {
    if (err instanceof TGUserNotFoundError) {
      ctx.reply(UNREGISTERED_USER_MESSAGE);
      return;
    }
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
    if (err instanceof SubscriptionExistsError) {
      ctx.reply("You are already subscribed to this Twitter handle.");
      return;
    }
    ctx.reply("Something went wrong. Please try again.");
    return;
  }

  const fmtXHandle = formatXHandle(subscription.xHandle);

  ctx.reply(
    `Subscribed to ${fmtXHandle} successfully! You will receive notifications for new tweets.`
  );
};
