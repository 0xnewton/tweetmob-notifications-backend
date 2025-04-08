# TweetMob Backend

This is the backend for the TweetMob project. It hosted on GCP and Firebase.

## Setup

... Adds notes about infra

### Telegram Bot

1. Create a bot in telegram with @botfather
2. Get the token and add it to GSM
3. Deploy backend to get webhook URL
4. Set webhook URL to the bot using the token
   `curl -F "url=YOUR_SERVER_URL/webhook" https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook`
