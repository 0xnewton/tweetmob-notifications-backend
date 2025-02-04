import { Context, Markup } from "telegraf";
import { User } from "../users/types";
import { logger } from "firebase-functions";
import { userService } from "../users/service";
import { FetchResult } from "../lib/types";
import { TGUserNotFoundError } from "../users/errors";
import { Subscription } from "../subscriptions/types";
import { formatXHandle } from "../lib/x";

export const UNREGISTERED_USER_MESSAGE =
  "You are not registered. Please use /start to register before running this command.";

export const getUserFromContext = async (
  context: Context
): Promise<FetchResult<User>> => {
  logger.info("Fetching user from context", { context });

  if (!context.from) {
    logger.info("Unable to retrieve user details", { context });
    throw new Error("Unable to retrieve your user details. Please try again.");
  }

  let user: FetchResult<User> | null = null;
  try {
    user = await userService.getByTelegramID(context.from.id);
  } catch (err) {
    logger.error("Error fetching user", { context, err });
    throw new Error("Something went wrong. Please try again.");
  }

  if (!user) {
    logger.info("User not found", { context });
    throw new TGUserNotFoundError("User not found", context.from.id);
  }

  logger.info("User details", { user });

  return user;
};

/**
 * Escapes Telegram MarkdownV2 special characters by prefixing them with a backslash.
 * The characters escaped are: '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'
 *
 * @param text The input string to escape.
 * @returns The escaped string.
 */
export function escapeMarkdown(text: string): string {
  // We create a regex that matches any of the special characters.
  // Using the RegExp constructor with a string literal lets us easily escape the characters.
  const escapeCharsRegex = new RegExp(
    "([_*\\[\\]\\(\\)~`>#+\\-=\\|{}\\.!])",
    "g"
  );
  return text.replace(escapeCharsRegex, "\\$1");
}

export const generateSubMessage = (sub: Subscription) => {
  return `*[${escapeMarkdown(formatXHandle(sub.xHandle))}](https://twitter.com/${escapeMarkdown(sub.xHandle)})*\nWebhook: ${escapeMarkdown(sub.webhookURL)}\n\n`;
};

export const generateSubEditButtons = (sub: Subscription) => {
  // Create inline keyboard rows for each subscription.
  // Each subscription gets its own row with "Edit Webhook" and "Unsubscribe" buttons.
  const subscriptionButtons = [
    Markup.button.callback(
      `Edit ${escapeMarkdown(formatXHandle(sub.xHandle))}`,
      `editWebhook:${sub.id}`
    ),
    Markup.button.callback(
      `Unsubscribe ${escapeMarkdown(formatXHandle(sub.xHandle))}`,
      `unsubscribe:${sub.id}`
    ),
  ];

  return subscriptionButtons;
};
