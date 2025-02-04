import { logger } from "firebase-functions";
import { Context, Markup } from "telegraf";
import { Subscription } from "../../subscriptions/types";
import { SubscriptionService } from "../../subscriptions/service";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import { getUserFromContext, UNREGISTERED_USER_MESSAGE } from "../utils";
import { TGUserNotFoundError } from "../../users/errors";
import { formatXHandle } from "../../lib/x";

export const listSubs = async (ctx: Context) => {
  logger.info("List subs command received", { ctx });

  if (!ctx.from) {
    logger.info("Unable to retrieve user details", { ctx });
    ctx.reply("Unable to retrieve your user details. Please try again.");
    return;
  }

  ctx.reply("Fetching your subscriptions...");

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

  const subs: Subscription[] = [];
  try {
    const data = await SubscriptionService.list({
      context: {
        user: user.data,
      },
      filter: {
        limit: 1000,
      },
    });
    subs.push(...data.data.map((sub) => sub.data));
  } catch (err) {
    logger.error("Error fetching subscriptions", { ctx, err });
    ctx.reply("Something went wrong. Please try again.");
    return;
  }

  ctx.reply(`You have ${subs.length} subscriptions:`);

  // Iterate through each subscription and send a message with an inline keyboard
  for (const sub of subs) {
    const messageText = `*${formatXHandle(sub.xHandle)}*\nWebhook: ${sub.webhookURL}`;

    // Inline keyboard with "Edit Webhook" and "Unsubscribe" buttons.
    const keyboard = Markup.inlineKeyboard([
      Markup.button.callback("Edit Webhook", `editWebhook:${sub.id}`),
      Markup.button.callback("Unsubscribe", `unsubscribe:${sub.id}`),
    ]);

    await ctx.replyWithMarkdownV2(messageText, {
      reply_markup: keyboard.reply_markup,
    });
  }

  return;
};
