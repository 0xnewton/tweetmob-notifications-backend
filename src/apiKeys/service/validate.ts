import { logger } from "firebase-functions";
import { hashWithSHA512 } from "../../lib/crypto";
import { getAPIKeyByHash } from "../api";
import { User } from "../../users/types";
import { userService } from "../../users/service";
import { FetchResult } from "../../lib/types";
import { APIKey } from "../types";

interface ValidateResponse {
  user: FetchResult<User>;
  key: FetchResult<APIKey>;
}
export const validate = async (apiKey: string): Promise<ValidateResponse> => {
  logger.info("Validating API key", {
    isEmpty: !apiKey || apiKey.length === 0,
  });

  // Hash it
  const hash = hashWithSHA512(apiKey);

  // Look up in the database
  const key = await getAPIKeyByHash({ hash });

  if (!key) {
    logger.info("API key not found", { hash });
    throw new Error("Unauthorized");
  }

  logger.info("API key found", { id: key.data.id, userID: key.data.createdAt });

  // Fetch the user
  const user = await userService.getByUserID(key.data.createdBy);

  if (!user) {
    logger.error("User not found", { id: key.data.createdBy });
    throw new Error("Unauthorized");
  }

  return { user, key };
};
