const PRIVATE_IPV4_RANGES = [
  [10, 0, 0, 0, 8],
  [127, 0, 0, 0, 8],
  [169, 254, 0, 0, 16],
  [172, 16, 0, 0, 12],
  [192, 168, 0, 0, 16],
  [0, 0, 0, 0, 8],
] as const;

const isPrivateIPv4 = (hostname: string): boolean => {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return false;
  }
  if (parts.some((n) => n < 0 || n > 255)) {
    return false;
  }
  const [a, b, c, d] = parts;
  for (const [ra, rb, rc, rd, mask] of PRIVATE_IPV4_RANGES) {
    const maskBits = 32 - mask;
    const ip =
      (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
    const range =
      (((ra << 24) >>> 0) + (rb << 16) + (rc << 8) + rd) >>> 0;
    if ((ip >>> maskBits) === (range >>> maskBits)) {
      return true;
    }
  }
  return false;
};

const isPrivateIPv6 = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  );
};

export const isValidURL = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return false;
    }
    if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};
