import { z } from "zod";
import { futureDateTimeSchema, idSchema, photoListSchema } from "./shared";

export const createCapsuleSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
  openAt: futureDateTimeSchema,
  files: photoListSchema.optional()
});

export const capsuleIdSchema = z.object({ id: idSchema });

export type CreateCapsuleInput = z.infer<typeof createCapsuleSchema>;
