import { onRequest } from "firebase-functions/v2/https";
import * as express from "express";
import * as cors from "cors";
import {
  subscribe,
  unsubscribe,
  onNotification,
  demoWebhookHandler,
  getSubscription,
  listSubscriptions,
} from "./handlers";
import { apiKeyValidator } from "./middleware/apiKeyValidator";
import { limiter, speedLimiter, handlerWrapper } from "./lib";
import { privateAPIKey, rapidAPIKey } from "../lib/secrets";
import { privateAPIKeyValidator } from "./middleware/privateAPIKeyValidator";
import { editSubscription } from "./handlers/editSubscription";

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
const publicAuthenticatedRouterV1 = express.Router();
const dangerousPublicUnauthenticatedRouter = express.Router();
const privateRouter = express.Router();
app.use("/v1", publicAuthenticatedRouterV1);
app.use("/internal/v1", privateRouter);
app.use("/demo48572", dangerousPublicUnauthenticatedRouter);

// Set up public api routes protected by user api keys
publicAuthenticatedRouterV1.use(limiter);
publicAuthenticatedRouterV1.use(speedLimiter);
publicAuthenticatedRouterV1.use(apiKeyValidator);

// Main API Routes
publicAuthenticatedRouterV1.post("/subscriptions", handlerWrapper(subscribe));
publicAuthenticatedRouterV1.delete(
  "/subscriptions/:id",
  handlerWrapper(unsubscribe)
);
publicAuthenticatedRouterV1.get(
  "/subscriptions/:id",
  handlerWrapper(getSubscription)
);
publicAuthenticatedRouterV1.get(
  "/subscriptions",
  handlerWrapper(listSubscriptions)
);
publicAuthenticatedRouterV1.post(
  "/subscriptions/:id",
  handlerWrapper(editSubscription)
);

// Routes for internal apis protected by internal API key
privateRouter.use(privateAPIKeyValidator);
privateRouter.post("/notification", handlerWrapper(onNotification));

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
