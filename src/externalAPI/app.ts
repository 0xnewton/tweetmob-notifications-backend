import * as functions from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import * as express from "express";
import * as cors from "cors";
import { subscribe, unsubscribe, tweet } from "./handlers";
import { apiKeyValidator } from "./middleware/apiKeyValidator";
import { limiter, speedLimiter, handlerWrapper } from "./lib";
import { privateAPIKey } from "../lib/secrets";
import { privateAPIKeyValidator } from "./middleware/privateAPIKeyValidator";

const app = express();

// General middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);
app.set("trust proxy", 1); // Enables the rate limiting to work behind a proxy (like firebase functions)

// Set up public api routes
const publicRouter = express.Router();
publicRouter.use(limiter);
publicRouter.use(speedLimiter);
publicRouter.use(apiKeyValidator);

publicRouter.post("/v1/subscriptions", handlerWrapper(subscribe));
publicRouter.delete("/v1/subscriptions", handlerWrapper(unsubscribe));

const privateRouter = express.Router();
privateRouter.use(privateAPIKeyValidator);

privateRouter.post("/v1/tweet", handlerWrapper(tweet));

export const api = onRequest(
  { timeoutSeconds: 540, secrets: [privateAPIKey], minInstances: 1 },
  app
);
