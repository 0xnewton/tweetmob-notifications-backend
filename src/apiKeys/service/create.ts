import { logger } from "firebase-functions";
import { generateAPIKey, hashWithSHA512 } from "../../lib/crypto";
import { FetchResult } from "../../lib/types";
import { UserID } from "../../users/types";
import { createAPIKey, getAPIKeyByHash } from "../api";
import { APIKey } from "../types";

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
  const existingKey = await getAPIKeyByHash({ hash });
  if (existingKey) {
    logger.error("API Key already exists", { hash });
    throw new Error("Something went wrong!");
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
