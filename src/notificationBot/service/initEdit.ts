import { logger } from "firebase-functions";
import { Context, Markup } from "telegraf";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import {
  generateSubEditButtons,
  generateSubMessage,
  getUserFromContext,
  UNREGISTERED_USER_MESSAGE,
} from "../utils";
import { TGUserNotFoundError } from "../../users/errors";
import { SubscriptionService } from "../../subscriptions/service";
import { Subscription } from "../../subscriptions/types";

export const initEdit = async (text: string, ctx: Context) => {
  logger.info("Edit subscription telegram bot service hit", {
    text,
    ctx,
  });

  const args = text.split(" ").slice(1); // Extract arguments from the command
  if (args.length < 1) {
    ctx.reply(
      "Invalid usage. Please provide an X handle.\nExample: /edit @xhandle"
    );
    return;
  }

  const [xHandle] = args;

  if (!ctx.from) {
    logger.info("Unable to retrieve user details", { ctx });
    ctx.reply("Unable to retrieve your user details. Please try again.");
    return;
  }

  // Get the user details
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

  // Get the sub
  let sub: FetchResult<Subscription> | null;
  try {
    sub = await SubscriptionService.getByXHandle({
      id: xHandle,
      context: { user: user.data },
    });
  } catch (err: any) {
    logger.error("Error fetching subscription", { ctx, err });
    ctx.reply("Something went wrong. Please try again.");
    return;
  }

  if (!sub) {
    ctx.reply("Subscription not found.");
    return;
  }

  const message = generateSubMessage(sub.data);
  const buttons = generateSubEditButtons(sub.data);
  const inlineKeyboard = Markup.inlineKeyboard(buttons);

  await ctx.replyWithMarkdownV2(message, {
    reply_markup: inlineKeyboard.reply_markup,
  });
};
