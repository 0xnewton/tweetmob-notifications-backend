import { Context } from "telegraf";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import { getUserFromContext } from "../utils";
import { logger } from "firebase-functions";
import { SubscriptionService } from "../../subscriptions/service";

// A simple global map to track pending webhook edits per user (keyed by Telegram user id).
const pendingEdits: Map<number, string> = new Map();

/**
 * Callback query handler for "Edit Webhook".
 * Expects callback data in the format "editWebhook:<subscriptionId>".
 *
 * This function:
 * - Parses the subscription id.
 * - Stores the subscription id for the user.
 * - Prompts the user to send the new webhook URL.
 */
export const handleEditWebhook = async (callbackData: string, ctx: Context) => {
  logger.info("Edit subscription telegram bot service hit", {
    callbackData,
    ctx,
  });
  if (!callbackData.startsWith("editWebhook:")) return;

  const subscriptionId = callbackData.split(":")[1];
  if (!subscriptionId) {
    await ctx.answerCbQuery("Invalid subscription ID.");
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCbQuery("User not found.");
    return;
  }

  // Save this subscription id as pending for the user.
  pendingEdits.set(userId, subscriptionId);

  // Acknowledge the callback query and ask for input.
  await ctx.answerCbQuery();
  await ctx.reply(
    "Please send the new webhook URL for the selected subscription."
  );
};

/**
 * Message handler for processing the user's input for updating the webhook URL.
 * This handler checks if the user has a pending edit and then updates the subscription.
 */
export const handleEditWebhookInput = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Re-fetch the user and their subscriptions.
  let user: FetchResult<User>;
  try {
    user = await getUserFromContext(ctx);
  } catch (err: any) {
    await ctx.answerCbQuery("User not found.");
    return;
  }

  // Check if this user has initiated an edit.
  const subscriptionId = pendingEdits.get(userId);
  if (!subscriptionId) {
    // Not in edit mode. You can either ignore this message or handle it normally.
    return;
  }

  // Use the text message as the new webhook URL.

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const newWebhookURL = ctx.message?.text;
  if (!newWebhookURL) return;

  try {
    // Update the subscription via your SubscriptionService.
    // Adjust the parameters as required by your service implementation.
    await SubscriptionService.edit(
      {
        id: subscriptionId,
        payload: { webhookURL: newWebhookURL },
      },
      {
        user: user.data,
      }
    );

    await ctx.reply(
      `Subscription updated with new webhook URL: ${newWebhookURL}`
    );
  } catch (error) {
    logger.error("Failed to update subscription", { error });
    await ctx.reply("Failed to update subscription. Please try again.");
  }

  // Remove the pending edit for this user.
  pendingEdits.delete(userId);
};

// export const editSub = async (callbackData: string, ctx: Context) => {
//   logger.info("Edit subscription service hit", { callbackData, ctx });
//   if (!callbackData || !callbackData.startsWith("editWebhook:")) return;
//   const subID = callbackData.split(":")[1];

//   // Re-fetch the user and their subscriptions.
//   let user: FetchResult<User>;
//   try {
//     user = await getUserFromContext(ctx);
//   } catch (err: any) {
//     await ctx.answerCbQuery("User not found.");
//     return;
//   }

//   try {
//     const data = await SubscriptionService.edit({
//       id: subID,
//         payload: {
//             webhookURL: "https://example.com/webhook",
//         },
//     },
//     { user: user.data });
//     const sub = data.data;
//     const messageText = `Editing subscription: ${sub.xHandle}`;
//     logger.info("Sending message with subscription details", { ctx, messageText });
//     await ctx.editMessageText(messageText);
//   }
// };
