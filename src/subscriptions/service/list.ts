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
  orderBy?: {
    key: keyof Pick<Subscription, "xHandle">;
    direction: "asc";
  };
  cursor?: SubscriptionID;
  limit: number;
}

const DEFAULT_ORDER_BY: keyof Subscription = "xHandle";

export const list = async (
  params: ListParams
): Promise<PaginatedResults<FetchResult<Subscription>>> => {
  const deletedAtKey: keyof Subscription = "deletedAt";

  // Query for subscriptions where "deletedAt" is null
  const collectionRef = getSubscriptionCollection(params.context.user.id).where(
    deletedAtKey,
    "==",
    null
  );

  let query = collectionRef.orderBy(
    params.filter?.orderBy?.key || DEFAULT_ORDER_BY,
    params.filter?.orderBy?.direction || "asc"
  );

  if (params.filter.cursor) {
    // Retrieve the document snapshot for the given cursor.
    const cursorRef = getSubscriptionDocument(
      params.context.user.id,
      params.filter.cursor
    );
    const cursorDoc = await cursorRef.get(); // Await the snapshot!
    query = query.startAfter(cursorDoc);
  }

  // Fetch one extra document to check if there is a next page.
  query = query.limit(params.filter.limit + 1);

  const snapshot = await query.get();

  // Determine if there is a next page based on the extra document.
  const hasNextPage = snapshot.size > params.filter.limit;

  // Map documents to a consistent structure.
  const docs = snapshot.docs.map((doc) => {
    return { data: doc.data(), ref: doc.ref };
  });

  // Only return the requested limit number of documents.
  const docsInPage = hasNextPage ? docs.slice(0, -1) : docs;

  return {
    data: docsInPage, // Return only the limited page of docs.
    hasNextPage,
    // Use the document reference's ID as the cursor.
    cursor: hasNextPage ? docsInPage[docsInPage.length - 1].ref.id : null,
    limit: params.filter.limit,
  };
};
