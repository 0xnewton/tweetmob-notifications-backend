import { create } from "./create";
import { hitWebhooks } from "./batchHitWebhooks";
import { getByID } from "./getByID";
import { getByXHandle } from "./getByXHandle";
import { list } from "./list";
import { unsubscribe } from "./unsubscribe";
import { edit } from "./edit";

export const SubscriptionService = {
  create,
  hitWebhooks,
  getByID,
  getByXHandle,
  list,
  unsubscribe,
  edit,
};
