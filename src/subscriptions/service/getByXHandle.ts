import { XHandle } from "../../kols/types";
import { FetchResult } from "../../lib/types";
import { User } from "../../users/types";
import { getExistingSubscriptionByXHandle } from "../api";
import { Subscription } from "../types";

interface GetByXHandleParams {
  id: XHandle;
  context: {
    user: User;
  };
}

export const getByXHandle = async (
  params: GetByXHandleParams
): Promise<FetchResult<Subscription> | null> => {
  const subs = await getExistingSubscriptionByXHandle({
    xHandle: params.id,
    userID: params.context.user.id,
  });

  return subs;
};
