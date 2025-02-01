import { onRequest } from "firebase-functions/v2/https";
import * as express from "express";
import * as cors from "cors";
import {
  subscribe,
  unsubscribe,
  onNotification,
  demoWebhookHandler,
} from "./handlers";
import { apiKeyValidator } from "./middleware/apiKeyValidator";
import { limiter, speedLimiter, handlerWrapper } from "./lib";
import { privateAPIKey, rapidAPIKey } from "../lib/secrets";
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
const publicAuthenticatedRouter = express.Router();
const dangerousPublicUnauthenticatedRouter = express.Router();
const privateRouter = express.Router();
app.use("/api", publicAuthenticatedRouter);
app.use("/internal", privateRouter);
app.use("/demo48572", dangerousPublicUnauthenticatedRouter);

// Set up public api routes protected by user api keys
publicAuthenticatedRouter.use(limiter);
publicAuthenticatedRouter.use(speedLimiter);
publicAuthenticatedRouter.use(apiKeyValidator);

publicAuthenticatedRouter.post("/v1/subscriptions", handlerWrapper(subscribe));
publicAuthenticatedRouter.delete(
  "/v1/subscriptions",
  handlerWrapper(unsubscribe)
);

// Routes for internal apis protected by internal API key
privateRouter.use(privateAPIKeyValidator);
privateRouter.post("/v1/notification", handlerWrapper(onNotification));

// Public un-authenticated router - mostly for internal demos & testing
dangerousPublicUnauthenticatedRouter.use(limiter);
dangerousPublicUnauthenticatedRouter.use(speedLimiter);
// Demo subscription webhook for internal testing
dangerousPublicUnauthenticatedRouter.post(
  "/webhookHandler",
  handlerWrapper(demoWebhookHandler)
);

export const api = onRequest(
  {
    timeoutSeconds: 540,
    secrets: [privateAPIKey, rapidAPIKey],
    minInstances: 1,
  },
  app
);
