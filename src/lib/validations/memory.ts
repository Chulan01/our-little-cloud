import { z } from "zod";
import { idSchema, pastDateSchema } from "./shared";

export const createMemorySchema = z.object({
  memoryDate: pastDateSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(5000)
});

export const updateMemorySchema = createMemorySchema.extend({
  id: idSchema
});

export const memoryIdSchema = z.object({ id: idSchema });

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
