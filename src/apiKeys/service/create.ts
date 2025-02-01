import { logger } from "firebase-functions";
import { generateAPIKey, hashWithSHA512 } from "../../lib/crypto";
import { FetchResult } from "../../lib/types";
import { UserID } from "../../users/types";
import { createAPIKey, getAPIKeyByHash, getAPIKeyCount } from "../api";
import { APIKey } from "../types";

const DEFAULT_MAX_API_KEYS = 10;

export interface CreateAPIKeyParams {
  userID: UserID;
}

export interface CreateAPIKeyResponse {
  stored: FetchResult<APIKey>;
  key: string;
}
export const create = async (
  params: CreateAPIKeyParams
): Promise<CreateAPIKeyResponse> => {
  logger.info("Create API service request hit", { params });
  const key = generateAPIKey();
  const hash = hashWithSHA512(key);
  // Make sure it does not exist
  const [existingKey, keyCount] = await Promise.all([
    getAPIKeyByHash({ hash }),
    getAPIKeyCount(params.userID),
  ]);
  if (existingKey) {
    logger.error("API Key already exists", { hash });
    throw new Error("Something went wrong!");
  }
  const maxKeyCount = DEFAULT_MAX_API_KEYS;
  if (keyCount >= maxKeyCount) {
    logger.debug("User has reached max API key count", {
      keyCount,
      max: maxKeyCount,
    });
    throw new Error(
      `You have reached the maximum number of API keys: ${maxKeyCount}`
    );
  }

  const apiKey = await createAPIKey({ userID: params.userID, hash });
  logger.info("Created API Key", {
    apiKey: {
      ...apiKey.data,
      hash: "***",
    },
  });

  return { stored: apiKey, key };
};
