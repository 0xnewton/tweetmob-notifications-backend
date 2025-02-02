import { logger } from "firebase-functions";
import { Context } from "telegraf";
import { User } from "../../users/types";
import { FetchResult } from "../../lib/types";
import { getUserFromContext, UNREGISTERED_USER_MESSAGE } from "../utils";
import { TGUserNotFoundError } from "../../users/errors";
import { ApiKeys } from "../../apiKeys/service";

export const generateAPIKey = async (ctx: Context) => {
  logger.info("API key generation command received", { ctx });
  ctx.reply("Ok, generating a new API key... Please wait.");

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
};
