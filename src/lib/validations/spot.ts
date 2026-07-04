import { z } from "zod";
import { idSchema } from "./shared";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const createSpotSchema = z.object({
  title: z.string().trim().min(1, "Добавь название места.").max(120),
  body: z.string().trim().min(1, "Расскажи пару слов об этом месте.").max(2000),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  spotDate: z.string().regex(isoDate).optional().nullable(),
  photoUrl: z.string().trim().url("Некорректная ссылка на фото.").max(2048).optional().nullable().or(z.literal("").transform(() => null))
});

export const updateSpotSchema = createSpotSchema.extend({
  id: z.string().min(1)
});

export const spotIdSchema = z.object({ id: z.string().min(1) });

export type CreateSpotInput = z.infer<typeof createSpotSchema>;
export type UpdateSpotInput = z.infer<typeof updateSpotSchema>;

export { idSchema };
