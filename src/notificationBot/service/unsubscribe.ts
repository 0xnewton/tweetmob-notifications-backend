import { Context } from "telegraf";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import { getUserFromContext } from "../utils";
import { logger } from "firebase-functions";
import { SubscriptionService } from "../../subscriptions/service";

/**
 * Callback query handler for "Edit Webhook".
 * Expects callback data in the format "editWebhook:<subscriptionId>".
 *
 * This function:
 * - Parses the subscription id.
 * - Stores the subscription id for the user.
 * - Prompts the user to send the new webhook URL.
 */
export const unsubscribe = async (callbackData: string, ctx: Context) => {
  logger.info("Edit unsubscribe telegram bot service hit", {
    callbackData,
    ctx,
  });
  if (!callbackData.startsWith("unsubscribe:")) return;

  const subscriptionId = callbackData.split(":")[1];
  if (!subscriptionId) {
    ctx.answerCbQuery("Invalid subscription ID.");
    return;
  }

  const userId = ctx.from?.id;
  if (!userId) {
    ctx.answerCbQuery("User not found.");
    return;
  }

  let user: FetchResult<User>;
  try {
    user = await getUserFromContext(ctx);
  } catch (err: any) {
    ctx.answerCbQuery("User not found.");
    return;
  }

  try {
    // Update the subscription via your SubscriptionService.
    // Adjust the parameters as required by your service implementation.
    await SubscriptionService.unsubscribe({
      id: subscriptionId,
      context: {
        user: user.data,
      },
    });

    ctx.reply("Subscription successfully removed.");
  } catch (error) {
    logger.error("Failed to update subscription", { error });
    ctx.reply("Failed to remove subscription. Please try again");
  }
};
