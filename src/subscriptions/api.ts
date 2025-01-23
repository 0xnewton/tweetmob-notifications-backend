import { db } from "../firebase";
import { KOL, KOLID, KOLStatus, XHandle } from "../kols/types";
import {
  getSubscriptionCollection,
  getSubscriptionCollectionGroup,
} from "../lib/refs";
import { FetchResult } from "../lib/types";
import { UserID } from "../users/types";
import { Subscription, SubscriptionStatus } from "./types";

interface GetSubscriptionByXHandleParams {
  xHandle: XHandle;
  userID: UserID;
}

export const getExistingSubscriptionByXHandle = async (
  params: GetSubscriptionByXHandleParams
): Promise<FetchResult<Subscription> | null> => {
  const key: keyof Subscription = "xHandle";
  const query = getSubscriptionCollection(params.userID).where(
    key,
    "==",
    params.xHandle
  );
  const snapshot = await query.get();
  const docs = snapshot.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });
  return docs[0] || null;
};

interface CreateSubscriptionParams {
  userID: UserID;
  webhookURL: string;
  kol: KOL;
}
export const createSubscription = async (
  params: CreateSubscriptionParams
): Promise<FetchResult<Subscription>> => {
  const docRef = getSubscriptionCollection(params.userID).doc();

  const body: Subscription = {
    id: docRef.id,
    kolID: params.kol.id,
    xHandle: params.kol.xHandle,
    createdBy: params.userID,
    webhookURL: params.webhookURL,
    status:
      params.kol.status === KOLStatus.Active
        ? SubscriptionStatus.Active
        : SubscriptionStatus.Pending,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
  };

  await docRef.create(body);

  return {
    data: body,
    ref: docRef,
  };
};

export const getInativeKOLSubscriptions = async (
  id: KOLID
): Promise<FetchResult<Subscription>[]> => {
  const key: keyof Subscription = "kolID";
  const query = getSubscriptionCollectionGroup()
    .where(key, "==", id)
    .where("status", "==", SubscriptionStatus.Pending);
  const snapshot = await query.get();
  const docs = snapshot.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });
  return docs;
};

interface BatchUpdateSubscriptionStatusParams {
  subscriptions: FetchResult<Subscription>[];
  status: SubscriptionStatus;
}
export const batchUpdateKOLSubscriptionStatuses = async (
  params: BatchUpdateSubscriptionStatusParams
): Promise<void> => {
  const batch = db.batch();
  params.subscriptions.forEach((sub) => {
    batch.update(sub.ref, { status: params.status });
  });
  await batch.commit();
};
