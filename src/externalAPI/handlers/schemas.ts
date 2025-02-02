import { z } from "zod";

export const subscriptionAPIMetadataSchema = z
  .record(z.union([z.string(), z.number()]))
  .optional();
