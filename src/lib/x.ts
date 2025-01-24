import { XHandle } from "../kols/types";

export const formatXHandle = (value: XHandle): string => {
  // Add leading '@'
  return `@${value}`;
};

export const parseXHandle = (value: string): XHandle => {
  // Trim and remove leading '@'
  return value.trim().replace(/^@/, "").toLowerCase();
};

export const isValidXHandle = (value: string): value is XHandle => {
  // Regular expression: only alphanumeric characters, underscores, and max length of 15
  const reg = /^[A-Za-z0-9_]{1,15}$/;
  return reg.test(value);
};
