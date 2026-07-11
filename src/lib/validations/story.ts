import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const createStoryEventSchema = z.object({
  eventDate: z.string().regex(isoDate, "Нужна дата в формате ГГГГ-ММ-ДД."),
  title: z.string().trim().min(1, "Добавь заголовок.").max(120),
  body: z.string().trim().min(1, "Расскажи, что случилось в этот день.").max(2000),
  emoji: z.string().trim().max(8).optional().nullable().or(z.literal("").transform(() => null)),
  photoUrl: z.string().trim().url("Некорректная ссылка на фото.").max(2048).optional().nullable().or(z.literal("").transform(() => null))
});

export const updateStoryEventSchema = createStoryEventSchema.extend({
  id: z.string().min(1)
});

export const storyEventIdSchema = z.object({ id: z.string().min(1) });

export const reactionPersonSchema = z.enum(["maxim", "vika"]);
export const heartKindSchema = z.enum(["tender", "spark", "pulse", "forever"]);

export const setStoryReactionSchema = z.object({
  eventId: z.string().min(1),
  person: reactionPersonSchema,
  heart: heartKindSchema
});

export const clearStoryReactionSchema = z.object({
  eventId: z.string().min(1),
  person: reactionPersonSchema
});

export type CreateStoryEventInput = z.infer<typeof createStoryEventSchema>;
export type UpdateStoryEventInput = z.infer<typeof updateStoryEventSchema>;
export type SetStoryReactionInput = z.infer<typeof setStoryReactionSchema>;
export type ClearStoryReactionInput = z.infer<typeof clearStoryReactionSchema>;
