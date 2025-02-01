import { CollectionGroup, CollectionReference } from "firebase-admin/firestore";
import { User, UserID } from "../users/types";
import { APIKey } from "../apiKeys/types";
import { db } from "../firebase";
import { DBCollections } from "./types";
import { Subscription } from "../subscriptions/types";
import { KOL, KOLID, Tweet } from "../kols/types";

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

export const userDocument = (userID: UserID) => {
  return usersCollection().doc(userID);
};

export const apiKeysCollectionGroup = (): CollectionGroup<APIKey> => {
  return db.collectionGroup(DBCollections.APIKeys) as CollectionGroup<APIKey>;
};

export const getSubscriptionCollection = (
  userID: UserID
): CollectionReference<Subscription> => {
  return db
    .collection(DBCollections.Users)
    .doc(userID)
    .collection(
      DBCollections.Subscriptions
    ) as CollectionReference<Subscription>;
};

export const getSubscriptionDocument = (
  userID: UserID,
  subscriptionID: string
) => {
  return getSubscriptionCollection(userID).doc(subscriptionID);
};

export const kolCollection = (): CollectionReference<KOL> => {
  return db.collection(DBCollections.KOLs) as CollectionReference<KOL>;
};

export const getSubscriptionCollectionGroup =
  (): CollectionGroup<Subscription> => {
    return db.collectionGroup(
      DBCollections.Subscriptions
    ) as CollectionGroup<Subscription>;
  };

export const getKOLCollection = (): CollectionReference<KOL> => {
  return db.collection(DBCollections.KOLs) as CollectionReference<KOL>;
};

export const getKOLDocument = (kolID: KOLID) => {
  return getKOLCollection().doc(kolID);
};

export const getTweetSubcollection = (kolID: KOLID) => {
  return getKOLDocument(kolID).collection(
    DBCollections.Tweets
  ) as CollectionReference<Tweet>;
};
