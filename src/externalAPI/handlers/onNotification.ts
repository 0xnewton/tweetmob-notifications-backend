import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { APIRequest, APIResponse } from "../types";
import { NotificationService } from "../../notifications/service";
import { XNotification } from "../../notifications/types";

interface ExpectedBody {
  data: XNotification;
}

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
      await NotificationService.receiveNotification({ data: payload.data });
    } catch (error) {
      logger.error("Error in onNotification", { error });
      response.status(500).send({ error: "Something went wrong" });
      return;
    }

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
  if (!("data" in payload)) {
    return false;
  }
  if (!payload.data) {
    return false;
  }
  if (typeof payload.data !== "object") {
    return false;
  }
  if (!("globalObjects" in payload.data && "timeline" in payload.data)) {
    return false;
  }
  if (!(typeof payload.data.globalObjects === "object")) {
    return false;
  }
  if (!payload.data.globalObjects) {
    return false;
  }
  if (!("users" in payload.data.globalObjects)) {
    return false;
  }
  if (!("tweets" in payload.data.globalObjects)) {
    return false;
  }
  if (!("notifications" in payload.data.globalObjects)) {
    return false;
  }
  if (
    typeof payload.data.globalObjects.users !== "object" ||
    !Array.isArray(payload.data.globalObjects.users)
  ) {
    return false;
  }
  if (
    typeof payload.data.globalObjects.tweets !== "object" ||
    !Array.isArray(payload.data.globalObjects.tweets)
  ) {
    return false;
  }
  if (
    typeof payload.data.globalObjects.notifications !== "object" ||
    !Array.isArray(payload.data.globalObjects.notifications)
  ) {
    return false;
  }
  return true;
};
