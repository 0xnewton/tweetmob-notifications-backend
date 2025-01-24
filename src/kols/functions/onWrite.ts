import * as functions from "firebase-functions";
import { DBCollections } from "../../lib/types";
import { KOL, KOLStatus } from "../types";
import {
  batchUpdateKOLSubscriptionStatuses,
  getInativeKOLSubscriptions,
} from "../../subscriptions/api";
import { SubscriptionStatus } from "../../subscriptions/types";

export const onWrite = functions.firestore
  .document(`${DBCollections.KOLs}/{kolId}`)
  .onWrite(async (change) => {
    const before = change.before.data() as KOL | undefined;
    const after = change.after.data() as KOL | undefined;
    functions.logger.info("KOL updated", { before, after });

    if (
      after?.status === KOLStatus.Active &&
      after?.status !== before?.status
    ) {
      functions.logger.info(
        "KOL is active. Updating subscriptions to active.",
        { after }
      );
      const inactiveKOLSubscriptions = await getInativeKOLSubscriptions(
        after.id
      );
      functions.logger.info("Inactive KOL subscriptions", {
        inactiveKOLSubscriptions,
      });
      await batchUpdateKOLSubscriptionStatuses({
        subscriptions: inactiveKOLSubscriptions,
        status: SubscriptionStatus.Active,
      });
    }
  });
