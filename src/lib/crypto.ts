import { randomBytes, createHash } from "crypto";

const DEFAULT_API_KEY_BYTES = 16; // number of bytes to use for API key generation

export const hashWithSHA512 = (apiKey: string): string => {
  const hash = createHash("sha512");
  hash.update(apiKey);
  return hash.digest("hex");
};

export const generateAPIKey = (length = DEFAULT_API_KEY_BYTES): string => {
  return randomBytes(length).toString("hex");
};
