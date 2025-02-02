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
import { apiDocs } from "./handlers/apiDocs";
import * as swaggerUi from "swagger-ui-express";
import { convertSubscriptionV1 } from "./converters/subscriptionV1";
import { SubscriptionV1 } from "./types";

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
const docsRouter = express.Router();
app.use("/v1", publicAuthenticatedRouterV1);
app.use("/internal/v1", privateRouter);
app.use("/public", dangerousPublicUnauthenticatedRouter);
app.use("/docs", docsRouter);

// Set up public api routes protected by user api keys
publicAuthenticatedRouterV1.use(limiter);
publicAuthenticatedRouterV1.use(speedLimiter);
publicAuthenticatedRouterV1.use(apiKeyValidator);

// Main API Routes
publicAuthenticatedRouterV1.post(
  "/subscriptions",
  handlerWrapper(subscribe<SubscriptionV1>(convertSubscriptionV1))
);
publicAuthenticatedRouterV1.delete(
  "/subscriptions/:id",
  handlerWrapper(unsubscribe<SubscriptionV1>(convertSubscriptionV1))
);
publicAuthenticatedRouterV1.get(
  "/subscriptions/:id",
  handlerWrapper(getSubscription<SubscriptionV1>(convertSubscriptionV1))
);
publicAuthenticatedRouterV1.get(
  "/subscriptions",
  handlerWrapper(listSubscriptions<SubscriptionV1>(convertSubscriptionV1))
);
publicAuthenticatedRouterV1.patch(
  "/subscriptions/:id",
  handlerWrapper(editSubscription<SubscriptionV1>(convertSubscriptionV1))
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

// API Docs
docsRouter.use("/", swaggerUi.serve, apiDocs());

export const api = onRequest(
  {
    timeoutSeconds: 540,
    secrets: [privateAPIKey, rapidAPIKey],
    minInstances: 1,
  },
  app
);
