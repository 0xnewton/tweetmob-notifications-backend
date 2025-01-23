import { rateLimit } from "express-rate-limit";
import { slowDown } from "express-slow-down";
import { Request, Response } from "express";
import {
  HttpsFunction,
  Request as FirebaseResquest,
} from "firebase-functions/v2/https";

// Limit each IP to 5 requests per second.
export const limiter = rateLimit({
  windowMs: 1000,
  max: 5,
  handler: function(_req, res) {
    res
      .status(429)
      .send("Too many requests, please try again after a few seconds.");
    return;
  },
});

// After max requests per windowMs, start delaying response.
export const speedLimiter = slowDown({
  windowMs: 5 * 60 * 1000, // 5 minutes
  delayAfter: 150, // after 150 requests in the 5-minute window
  delayMs: 50, // after max requests, delay by 50ms per request
});

// Needed for typecasting express.Request to functions.https.Request
// See https://github.com/firebase/firebase-functions/issues/417#issuecomment-500657318
export const handlerWrapper = (handler: HttpsFunction) => {
  return async (req: Request, res: Response) =>
    // Note this is only for typescript, the handler will still work without this but type errors will be thrown
    handler(req as FirebaseResquest, res);
};
