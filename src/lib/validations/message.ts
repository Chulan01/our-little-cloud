import { z } from "zod";
import { idSchema, optionalFutureDateTimeSchema } from "./shared";

export const sendMessageSchema = z.object({
  recipientId: z.string().trim().min(1),
  body: z.string().trim().min(1).max(2000),
  revealAt: optionalFutureDateTimeSchema
});

export const markAsReadSchema = z.object({ id: idSchema });

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
