import { Telegraf, Context } from "telegraf";
import * as botService from "./service";

const API_DOCS = "https://externalapi-qzvlzsqjjq-uc.a.run.app/docs";

enum Commands {
  start = "start",
  generate_api_key = "generate_api_key",
  subscribe = "subscribe",
  api_docs = "api_docs",
}

// Define bot commands (note: parameters are not defined here)
const commands = [
  {
    command: Commands.start,
    description: "Register your account",
  },
  {
    command: Commands.subscribe,
    description:
      "Subscribe to a Twitter handle (usage: /subscribe <x handle> <webhook URL>, e.g. /subscribe elonmusk https://your-webhook-url.com)",
  },
  {
    command: Commands.generate_api_key,
    description: "Generate a new API key",
  },
  {
    command: Commands.api_docs,
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

  bot.command(Commands.subscribe, async (ctx) => {
    await botService.subscribe(ctx.message.text, ctx);
  });

  bot.command(Commands.api_docs, (ctx) => {
    ctx.reply(`Please visit ${API_DOCS} for the API documentation.`);
  });

  return bot;
};
