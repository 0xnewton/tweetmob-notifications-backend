import { logger } from "firebase-functions";
import { db } from "../../firebase";
import {
  getSubscriptionDocument,
  getWebhookReciptDocumentRef,
} from "../../lib/refs";
import { Receipt, SubscriptionStatus } from "../types";
import { HitWebhooksResponse } from "./batchHitWebhooks";

export const writeWebhookReceipts = async (webhooks: HitWebhooksResponse[]) => {
  logger.info("Writing webhook receipts", { webhooks });
  const batch = db.batch();

  for (const webhook of webhooks) {
    const newRef = getWebhookReciptDocumentRef(
      webhook.subscription.createdBy,
      webhook.subscription.id
    );

    const payload: Receipt = {
      id: newRef.id,
      subscriptionID: webhook.subscription.id,
      kolID: webhook.kol.id,
      userID: webhook.subscription.createdBy,
      webhookPayload: webhook.webhookPayload,
      webhookHitAt: webhook.webhookHitAt,
      response: webhook.response,
      error: webhook.error,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    };
    // Write the receipt
    batch.create(newRef, payload);

    // Updates subscription status to active if needed
    if (webhook.subscription.status === SubscriptionStatus.Pending) {
      const subscriptionRef = getSubscriptionDocument(
        webhook.subscription.createdBy,
        webhook.subscription.id
      );
      batch.update(subscriptionRef, {
        status: SubscriptionStatus.Active,
        updatedAt: Date.now(),
      });
    }

    await batch.commit();
  }

  return webhooks;
};
