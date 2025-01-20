import { FetchResult } from "../../lib/types";
import { getUserByTelegramUserID } from "../api";
import { TelegramUserID, User } from "../types";

export const getByTelegramID = async (
  telegramID: TelegramUserID
): Promise<FetchResult<User> | null> => {
  const data = getUserByTelegramUserID(telegramID);

  return data;
};
