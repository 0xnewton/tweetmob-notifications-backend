import { getSubscriptionDocument } from "../../lib/refs";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import { Subscription, SubscriptionID } from "../types";

interface GetByIDParams {
  id: SubscriptionID;
  context: {
    user: User;
  };
}

export const getByID = async (
  params: GetByIDParams
): Promise<FetchResult<Subscription> | null> => {
  const documentRef = getSubscriptionDocument(
    params.context.user.id,
    params.id
  );
  const snapshot = await documentRef.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data || data.deletedAt) {
    return null;
  }
  return {
    data,
    ref: snapshot.ref,
  };
};
