import { z } from "zod";
import { idSchema } from "./shared";

export const createCounterSchema = z.object({
  label: z.string().trim().min(1).max(40),
  emoji: z.string().trim().max(8).optional().nullable(),
  value: z.coerce.number().int().min(0).default(0),
  isAuto: z.coerce.boolean().default(false)
});

export const incrementCounterSchema = z.object({
  id: idSchema,
  delta: z.coerce.number().int().min(-100000).max(100000)
});

export const setCounterSchema = z.object({
  id: idSchema,
  value: z.coerce.number().int().min(0)
});

export const counterIdSchema = z.object({ id: idSchema });

export type CreateCounterInput = z.infer<typeof createCounterSchema>;
export type IncrementCounterInput = z.infer<typeof incrementCounterSchema>;
export type SetCounterInput = z.infer<typeof setCounterSchema>;
