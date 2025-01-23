import { kolCollection } from "../lib/refs";
import { FetchResult } from "../lib/types";
import { parseXHandle } from "../lib/x";
import { UserID } from "../users/types";
import { KOL, KOLStatus, XHandle } from "./types";

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
  };

  await docRef.create(body);

  return {
    data: body,
    ref: docRef,
  };
};
