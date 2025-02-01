import { UpdateData } from "firebase-admin/firestore";
import {
  getKOLCollection,
  getKOLDocument,
  getTweetSubcollection,
  kolCollection,
} from "../lib/refs";
import { FetchResult } from "../lib/types";
import { batch } from "../lib/utils";
import { parseXHandle } from "../lib/x";
import { UserID } from "../users/types";
import { KOL, KOLID, KOLStatus, Tweet, XHandle } from "./types";
import { db } from "../firebase";
import { logger } from "firebase-functions";

export const getKOLByXHandle = async (
  xHandle: XHandle
): Promise<FetchResult<KOL> | null> => {
  const key: keyof KOL = "xHandle";
  const query = kolCollection().where(key, "==", xHandle);
  const snapshot = await query.get();
  const docs = snapshot.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });
  return docs[0] || null;
};

interface CreateKOLPayload {
  xHandle: XHandle;
  createdBy: UserID;
}

export const createKOL = async (
  payload: CreateKOLPayload
): Promise<FetchResult<KOL>> => {
  const parsedHandle = parseXHandle(payload.xHandle);
  const docRef = kolCollection().doc();
  const body: KOL = {
    id: docRef.id,
    xHandle: parsedHandle,
    status: KOLStatus.Pending,
    deletedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: payload.createdBy,
    lastPostSeenAt: null,
    xUserID: null, // Only filled in on first notification
    xUserIDStr: null, // Only filled in on first notification
    xScreenName: null,
    xName: null,
    xUpdates: null,
  };

  await docRef.create(body);

  return {
    data: body,
    ref: docRef,
  };
};

export const bulkFetchKOLsByHandle = async (
  ids: XHandle[]
): Promise<FetchResult<KOL>[]> => {
  const idBatches = batch(ids);
  const keyXHandle: keyof KOL = "xHandle";
  const result = await Promise.all(
    idBatches.map(async (batch) => {
      const snapshot = await getKOLCollection()
        .where(keyXHandle, "in", batch)
        .get();
      return snapshot.docs.map((doc) => {
        return {
          data: doc.data(),
          ref: doc.ref,
        };
      });
    })
  );
  const flat = result.flat();
  return flat;
};

export interface BatchUpdateKOLsParams {
  kolPayload?: UpdateData<KOL>;
  id: KOLID;
  tweet?: Tweet;
}

export const batchUpdateKOLs = async (params: BatchUpdateKOLsParams[]) => {
  const batchesOfData = batch(params, 500);

  for (const batch of batchesOfData) {
    const dbClient = db.batch();

    for (const param of batch) {
      if (param.kolPayload) {
        const kolRef = getKOLDocument(param.id);
        dbClient.update(kolRef, param.kolPayload);
      }
      if (param.tweet) {
        const tweetRef = getTweetSubcollection(param.id).doc();
        const body: Tweet = {
          id: tweetRef.id,
          kolID: param.id,
          tweet: param.tweet.tweet,
          createdAt: Date.now(),
        };
        dbClient.create(tweetRef, body);
      }
    }
    try {
      await dbClient.commit();
    } catch (err) {
      logger.info(
        "Error in batchCreateUserNotificationSeen in firestore commit",
        { err }
      );
    }
  }

  return;
};
