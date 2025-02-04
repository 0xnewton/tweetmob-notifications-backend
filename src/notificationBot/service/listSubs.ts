import { logger } from "firebase-functions";
import { Context, Markup } from "telegraf";
import { Subscription } from "../../subscriptions/types";
import { SubscriptionService } from "../../subscriptions/service";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import {
  generateSubEditButtons,
  generateSubMessage,
  getUserFromContext,
  UNREGISTERED_USER_MESSAGE,
} from "../utils";
import { TGUserNotFoundError } from "../../users/errors";

// Adjust the page size as needed
const PAGE_SIZE = 5;

/**
 * Given an array of subscriptions and a page number, builds the Markdown message
 * text and an inline keyboard with a row for each subscription (including "Edit Webhook" and "Unsubscribe")
 * and a pagination row if needed.
 */
function buildSubsPage(
  subs: Subscription[],
  page: number
): {
  messageText: string;
  inlineKeyboard: ReturnType<typeof Markup.inlineKeyboard>;
} {
  const start = (page - 1) * PAGE_SIZE;
  const pageSubs = subs.slice(start, start + PAGE_SIZE);
  let messageText = `*Your Subscriptions \\(Page ${page}\\)\\:*\n\n`;

  pageSubs.forEach((sub) => {
    // messageText += `*${formatXHandle(sub.xHandle)}*\nWebhook: ${sub.webhookURL}\n\n`;
    messageText += generateSubMessage(sub);
  });

  // Create inline keyboard rows for each subscription.
  // Each subscription gets its own row with "Edit Webhook" and "Unsubscribe" buttons.
  const subscriptionButtons = pageSubs.map(generateSubEditButtons);

  // Create pagination buttons if there are multiple pages.
  const totalPages = Math.ceil(subs.length / PAGE_SIZE);
  const paginationButtons = [];
  if (page > 1) {
    paginationButtons.push(
      Markup.button.callback("Previous", `subsPage:${page - 1}`)
    );
  }
  if (page < totalPages) {
    paginationButtons.push(
      Markup.button.callback("Next", `subsPage:${page + 1}`)
    );
  }
  if (paginationButtons.length) {
    subscriptionButtons.push(paginationButtons);
  }

  return {
    messageText,
    inlineKeyboard: Markup.inlineKeyboard(subscriptionButtons),
  };
}

/**
 * Command handler for /list. Fetches the user's subscriptions,
 * builds the first page and replies with a paginated message.
 */
export const listSubs = async (ctx: Context) => {
  logger.info("List subs command received", { ctx });

  if (!ctx.from) {
    logger.info("Unable to retrieve user details", { ctx });
    ctx.reply("Unable to retrieve your user details. Please try again.");
    return;
  }

  // Inform the user that we're fetching their subscriptions.
  await ctx.reply("Fetching your subscriptions...");

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

  // Fetch subscriptions from your service
  const subs: Subscription[] = [];
  try {
    const data = await SubscriptionService.list({
      context: { user: user.data },
      filter: { limit: 1000 },
    });
    subs.push(...data.data.map((sub) => sub.data));
  } catch (err) {
    logger.error("Error fetching subscriptions", { ctx, err });
    ctx.reply("Something went wrong. Please try again.");
    return;
  }

  if (subs.length === 0) {
    ctx.reply("You have no subscriptions.");
    return;
  }

  logger.info("Crafting message for subscriptions", { ctx, subs });
  // Build the first page
  const initialPage = 1;
  const { messageText, inlineKeyboard } = buildSubsPage(subs, initialPage);
  logger.info("Sending message with subscriptions", { ctx, messageText });
  await ctx.replyWithMarkdownV2(messageText, {
    reply_markup: inlineKeyboard.reply_markup,
  });
};

/**
 * Callback query handler for pagination. When the user clicks "Next" or "Previous"
 * (callback data format: subsPage:<page number>), re-fetch the subscriptions,
 * rebuild the page and edit the original message.
 *
 * Note: In a production bot you might want to store the user's subscriptions in
 * session or cache instead of re-fetching every time.
 */
export const handleSubsPagination = async (
  callbackData: string,
  ctx: Context
) => {
  if (!callbackData || !callbackData.startsWith("subsPage:")) return;

  // Extract the target page number.
  const page = parseInt(callbackData.split(":")[1], 10);
  if (isNaN(page)) {
    await ctx.answerCbQuery("Invalid page number.");
    return;
  }

  // Re-fetch the user and their subscriptions.
  let user: FetchResult<User>;
  try {
    user = await getUserFromContext(ctx);
  } catch (err: any) {
    await ctx.answerCbQuery("User not found.");
    return;
  }

  const subs: Subscription[] = [];
  try {
    const data = await SubscriptionService.list({
      context: { user: user.data },
      filter: { limit: 1000 },
    });
    subs.push(...data.data.map((sub) => sub.data));
  } catch (err) {
    logger.error("Error fetching subscriptions", { ctx, err });
    await ctx.answerCbQuery("Error fetching subscriptions.");
    return;
  }

  const { messageText, inlineKeyboard } = buildSubsPage(subs, page);
  try {
    await ctx.editMessageText(messageText, {
      parse_mode: "MarkdownV2",
      reply_markup: inlineKeyboard.reply_markup,
    });
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error("Failed to edit message", { error });
    await ctx.answerCbQuery("Failed to update page.");
  }
};
