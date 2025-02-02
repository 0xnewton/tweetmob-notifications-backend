import {
  getSubscriptionCollection,
  getSubscriptionDocument,
} from "../../lib/refs";
import { FetchResult, PaginatedResults } from "../../lib/types";
import { User } from "../../users/types";
import { Subscription, SubscriptionID } from "../types";

interface ListParams {
  context: {
    user: User;
  };
  filter: Filters;
}

interface Filters {
  orderBy: {
    key: keyof Pick<Subscription, "xHandle">;
    direction: "asc";
  };
  cursor?: SubscriptionID;
  limit: number;
}

export const list = async (
  params: ListParams
): Promise<PaginatedResults<FetchResult<Subscription>>> => {
  const deletedAtKey: keyof Subscription = "deletedAt";
  const collectionRef = getSubscriptionCollection(params.context.user.id).where(
    deletedAtKey,
    "==",
    null
  );
  let query = collectionRef.orderBy(
    params.filter.orderBy.key,
    params.filter.orderBy.direction
  );

  if (params.filter.cursor) {
    // Need to fetch the cursor unfortunately
    const cursorDoc = getSubscriptionDocument(
      params.context.user.id,
      params.filter.cursor
    );
    query = query.startAfter(cursorDoc);
  }

  query = query.limit(params.filter.limit + 1);

  const snapshot = await query.get();

  let hasNextPage = false;
  if (params.filter.limit) {
    hasNextPage = snapshot.size > params.filter.limit;
  }

  const docs = snapshot.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });

  const docsInPage = hasNextPage ? docs.slice(0, -1) : docs;

  return {
    data: docs,
    hasNextPage,
    cursor: hasNextPage ? docsInPage[docsInPage.length - 1].data.id : null,
    limit: params.filter.limit,
  };
};
