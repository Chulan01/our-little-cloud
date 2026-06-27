import { z } from "zod";
import { idSchema } from "./shared";

export const addReasonSchema = z.object({
  text: z.string().trim().min(1).max(280)
});

export const updateReasonSchema = addReasonSchema.extend({
  id: idSchema
});

export const deleteReasonSchema = z.object({ id: idSchema });

export const reorderReasonsSchema = z.object({
  orderedIds: z.array(idSchema).min(1).max(365)
});

export type AddReasonInput = z.infer<typeof addReasonSchema>;
export type UpdateReasonInput = z.infer<typeof updateReasonSchema>;
export type ReorderReasonsInput = z.infer<typeof reorderReasonsSchema>;
