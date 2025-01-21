import { logger } from "firebase-functions";
import { FetchResult } from "../../lib/types";
import { getUserByID } from "../api";
import { User } from "../types";

export const getByUserID = async (
  userID: string
): Promise<FetchResult<User> | null> => {
  logger.info("Fetching user by user id", { userID });
  const user = await getUserByID(userID);

  return user;
};
