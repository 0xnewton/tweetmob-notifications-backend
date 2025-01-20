import { CollectionGroup, CollectionReference } from "firebase-admin/firestore";
import { User, UserID } from "../users/types";
import { APIKey } from "../apiKeys/types";
import { db } from "../firebase";
import { DBCollections } from "./types";

export const apiKeysCollection = (
  userID: UserID
): CollectionReference<APIKey> => {
  return db
    .collection(DBCollections.Users)
    .doc(userID)
    .collection(DBCollections.APIKeys) as CollectionReference<APIKey>;
};

export const usersCollection = (): CollectionReference<User> => {
  return db.collection(DBCollections.Users) as CollectionReference<User>;
};

export const apiKeysCollectionGroup = (): CollectionGroup<APIKey> => {
  return db.collectionGroup(DBCollections.APIKeys) as CollectionGroup<APIKey>;
};
