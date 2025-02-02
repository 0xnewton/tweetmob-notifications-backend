import { UpdateData } from "firebase-admin/firestore";
import { db } from "../firebase";
import { KOL, KOLID, KOLStatus, XHandle } from "../kols/types";
import { MAX_IN_CLAUSE_LIMIT } from "../lib/firestore";
import {
  getSubscriptionCollection,
  getSubscriptionCollectionGroup,
  getSubscriptionDocument,
} from "../lib/refs";
import { FetchResult } from "../lib/types";
import { batch } from "../lib/utils";
import { UserID } from "../users/types";
import {
  Subscription,
  SubscriptionAPIMetadata,
  SubscriptionID,
  SubscriptionStatus,
} from "./types";

interface GetSubscriptionByXHandleParams {
  xHandle: XHandle;
  userID: UserID;
}

export const getExistingSubscriptionByXHandle = async (
  params: GetSubscriptionByXHandleParams
): Promise<FetchResult<Subscription> | null> => {
  const key: keyof Subscription = "xHandle";
  const deletedAtKey: keyof Subscription = "deletedAt";
  const query = getSubscriptionCollection(params.userID)
    .where(key, "==", params.xHandle)
    .where(deletedAtKey, "==", null);
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
  apiMetadata?: SubscriptionAPIMetadata;
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
    apiMetadata: params.apiMetadata
      ? parseAPIMetadata(params.apiMetadata)
      : null,
  };

  await docRef.create(body);

  return {
    data: body,
    ref: docRef,
  };
};

export const batchFetchKOLSubscriptions = async (
  ids: KOLID[]
): Promise<FetchResult<Subscription>[]> => {
  const kolIDKey: keyof Subscription = "kolID";
  const deletedAtKey: keyof Subscription = "deletedAt";

  // Break the ids array into chunks respecting the `in` clause limit
  const idBatches = batch(ids, MAX_IN_CLAUSE_LIMIT);

  // Use Promise.all to fetch all batches in parallel
  const allResults = await Promise.all(
    idBatches.map(async (idBatch) => {
      const query = getSubscriptionCollectionGroup()
        .where(kolIDKey, "in", idBatch)
        .where(deletedAtKey, "==", null);
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        data: doc.data(),
        ref: doc.ref,
      }));
    })
  );

  // Flatten the results
  return allResults.flat();
};

export const getKOLSubscriptions = async (
  id: KOLID
): Promise<FetchResult<Subscription>[]> => {
  const kolIDKey: keyof Subscription = "kolID";
  const query = getSubscriptionCollectionGroup().where(kolIDKey, "==", id);
  const snapshot = await query.get();
  const docs = snapshot.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });
  return docs;
};

export const getInativeKOLSubscriptions = async (
  id: KOLID
): Promise<FetchResult<Subscription>[]> => {
  const kolIDKey: keyof Subscription = "kolID";
  const statusKey: keyof Subscription = "status";
  const query = getSubscriptionCollectionGroup()
    .where(kolIDKey, "==", id)
    .where(statusKey, "==", SubscriptionStatus.Pending);
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

export const getUserSubCount = async (userID: UserID): Promise<number> => {
  const collectionRef = getSubscriptionCollection(userID).where(
    "status",
    "==",
    SubscriptionStatus.Active
  );

  // Create an aggregation query for counting documents
  const countAggregation = collectionRef.count();

  // Execute the aggregation query
  const snapshot = await countAggregation.get();

  // The result is available in snapshot.data().count
  return snapshot.data().count;
};

export const parseAPIMetadata = (payload: unknown): SubscriptionAPIMetadata => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return {};
  }

  const metadata: SubscriptionAPIMetadata = {};

  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" || typeof value === "number") {
      metadata[key] = value;
    }
  }

  return metadata;
};

type EditSubscriptionPayload = Pick<
  UpdateData<Subscription>,
  "deletedAt" | "updatedAt" | "webhookURL" | "apiMetadata"
>;

interface EditSubscriptionParams {
  id: SubscriptionID;
  userID: UserID;
  payload: EditSubscriptionPayload;
}
export const editSubscription = async (
  params: EditSubscriptionParams
): Promise<FetchResult<Subscription> | null> => {
  // remove any fields that are undefined as they will be ignored.
  // to delete the fields, use null instead

  const payload = { ...params.payload };

  Object.entries(params.payload).forEach(([key, value]) => {
    if (value === undefined && key in payload) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete payload[key];
    }
  });

  const doc = getSubscriptionDocument(params.userID, params.id);
  const body: UpdateData<Subscription> = {
    ...payload,
    updatedAt: Date.now(),
  };
  await doc.update(body);

  const snapshot = await doc.get();
  const data = snapshot.data();

  if (!snapshot.exists || !data) {
    return null;
  }

  return {
    data,
    ref: snapshot.ref,
  };
};
