import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { NotificationService } from "../../notifications/service";
import { XNotification } from "../../notifications/types";

type ExpectedBody = XNotification;

export const onNotification = onRequest(
  async (request: APIRequest, response: APIResponse) => {
    const payload = request.body;
    logger.info("onNotification api route handler", { payload });

    // Perform payload validation
    if (!valdiatePayload(payload)) {
      logger.debug("Invalid payload", { payload });
      response.status(400).send({ error: "Invalid payload" });
      return;
    }

    try {
      await NotificationService.receiveNotification({ data: payload });
    } catch (error) {
      logger.error("Error in onNotification", { error });
      response.status(500).send({ error: "Something went wrong" });
      return;
    }

    response
      .status(200)
      .send({ success: true, message: "Notification received" });
    return;
  }
);

const valdiatePayload = (payload: unknown): payload is ExpectedBody => {
  if (!payload) {
    return false;
  }
  if (typeof payload !== "object") {
    return false;
  }
  if (!("globalObjects" in payload && "timeline" in payload)) {
    return false;
  }
  if (!(typeof payload.globalObjects === "object")) {
    return false;
  }
  if (!payload.globalObjects) {
    return false;
  }
  // if (!("users" in payload.globalObjects)) {
  //   return false;
  // }
  // if (!("tweets" in payload.globalObjects)) {
  //   return false;
  // }
  // if (!("notifications" in payload.globalObjects)) {
  //   return false;
  // }
  if (
    "users" in payload.globalObjects &&
    (typeof payload.globalObjects.users !== "object" ||
      Array.isArray(payload.globalObjects.users))
  ) {
    return false;
  }
  if (
    "tweets" in payload.globalObjects &&
    (typeof payload.globalObjects.tweets !== "object" ||
      Array.isArray(payload.globalObjects.tweets))
  ) {
    return false;
  }
  if (
    "notifications" in payload.globalObjects &&
    (typeof payload.globalObjects.notifications !== "object" ||
      Array.isArray(payload.globalObjects.notifications))
  ) {
    return false;
  }
  return true;
};
