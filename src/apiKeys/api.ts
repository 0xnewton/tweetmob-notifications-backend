import { logger } from "firebase-functions";
import { apiKeysCollection, apiKeysCollectionGroup } from "../lib/refs";
import { FetchResult } from "../lib/types";
import { UserID } from "../users/types";
import { APIKey } from "./types";

interface CreateAPIKeyParams {
  userID: UserID;
  hash: string;
}

export const createAPIKey = async (
  params: CreateAPIKeyParams
): Promise<FetchResult<APIKey>> => {
  logger.info("Create API in firestore", { params });
  const collection = apiKeysCollection(params.userID);
  const docRef = collection.doc();
  const body: APIKey = {
    id: docRef.id,
    hash: params.hash,
    createdBy: params.userID,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await docRef.create(body);

  return {
    data: body,
    ref: docRef,
  };
};

interface GetAPIKeyByHashParams {
  hash: string;
}
export const getAPIKeyByHash = async (
  params: GetAPIKeyByHashParams
): Promise<FetchResult<APIKey> | null> => {
  logger.info("Fetch API by hash", { params });
  const apiKey = await apiKeysCollectionGroup()
    .where("hash", "==", params.hash)
    .get();
  const docs = apiKey.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });
  return docs[0] || null;
};
