import { Telegraf, Context } from "telegraf";
import * as botService from "./service";
import { logger } from "firebase-functions";

const API_DOCS = "https://externalapi-qzvlzsqjjq-uc.a.run.app/docs";

enum Commands {
  start = "start",
  generate_api_key = "generate_api_key",
  sub = "sub",
  list = "list",
  docs = "docs",
}

// Define bot commands (note: parameters are not defined here)
const commands = [
  {
    command: Commands.start,
    description: "Register your account",
  },
  {
    command: Commands.sub,
    description: `Subscribe to a Twitter handle (usage: /${Commands.sub} <x handle> <webhook URL>, e.g. /${Commands.sub} elonmusk https://your-webhook-url.com)`,
  },
  {
    command: Commands.list,
    description: "List your subscriptions",
  },
  {
    command: Commands.generate_api_key,
    description: "Generate a new API key",
  },
  {
    command: Commands.docs,
    description: "View the API documentation",
  },
];

export const initializeBot = (apiKey: string) => {
  const bot = new Telegraf<Context>(apiKey);

  bot.telegram.setMyCommands(commands);

  bot.start(async (ctx: Context) => {
    await botService.start(ctx);
  });

  bot.command(Commands.generate_api_key, async (ctx) => {
    await botService.generateAPIKey(ctx);
  });

  bot.command(Commands.sub, async (ctx) => {
    await botService.subscribe(ctx.message.text, ctx);
  });

  bot.command(Commands.list, async (ctx) => {
    await botService.listSubs(ctx);
  });

  bot.command(Commands.docs, (ctx) => {
    ctx.reply(`Please visit ${API_DOCS} for the API documentation.`);
  });

  // Register the callback query handler for pagination.
  // This example shows a simple approach: if the callback data starts with 'subsPage:' it will call handleSubsPagination.
  bot.on("callback_query", async (ctx) => {
    logger.info("Callback query received", { ctx });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const data = ctx?.update?.callback_query?.data;
    logger.info("Callback query data", { data });
    if (!data) {
      logger.error("No data in callback query", { ctx });
    }
    if (data.startsWith("subsPage:")) {
      await botService.handleSubsPagination(data, ctx);
    } else if (data.startsWith("editWebhook:")) {
      await botService.handleEditWebhook(data, ctx);
    } else if (data.startsWith("unsubscribe:")) {
      logger.info("yp");
    }
  });

  // Register a message handler to catch the new webhook URL input.
  bot.on("message", async (ctx) => {
    await botService.handleEditWebhookInput(ctx);
  });

  return bot;
};
