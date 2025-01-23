import { logger } from "firebase-functions";
import { FetchResult } from "../../lib/types";
import { parseXHandle, isValidXHandle } from "../../lib/x";
import { UserID } from "../../users/types";
import { KOL } from "../types";
import { createKOL, getKOLByXHandle } from "../api";

interface CreateKOLServiceParams {
  xHandle: string;
  createdBy: UserID;
}
export const create = async (
  params: CreateKOLServiceParams
): Promise<FetchResult<KOL>> => {
  logger.info("Create KOL service hit", { params });
  const parsedHandle = parseXHandle(params.xHandle);
  if (!isValidXHandle(parsedHandle)) {
    logger.debug("Invalid XHandle", { parsedHandle, params });
    throw new Error("Invalid X Handle. Must be a valid twitter handle");
  }

  // Make sure no KOLs already exist with this xHandle
  const existingKOL = await getKOLByXHandle(parsedHandle);
  if (existingKOL) {
    logger.error("KOL already exists", { params });
    throw new Error("KOL already exists");
  }

  const kol = await createKOL({
    xHandle: parsedHandle,
    createdBy: params.createdBy,
  });

  return kol;
};
