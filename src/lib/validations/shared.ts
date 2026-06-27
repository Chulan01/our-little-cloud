import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const idSchema = z.string().uuid();

export const pastDateSchema = z.string().regex(isoDate).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date <= new Date();
}, "Дата не может быть в будущем.");

export const futureDateTimeSchema = z.string().datetime({ offset: true }).refine((value) => {
  return new Date(value).getTime() > Date.now();
}, "Дата должна быть в будущем.");

export const optionalFutureDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .optional()
  .nullable()
  .refine((value) => !value || new Date(value).getTime() > Date.now(), "Дата должна быть в будущем.");

export const photoFileSchema = z
  .custom<File>((value) => value instanceof File, "Нужен файл.")
  .refine((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type), "Поддерживаются JPG, PNG и WebP.")
  .refine((file) => file.size <= 5 * 1024 * 1024, "Фото должно быть не больше 5MB.");

export const photoListSchema = z.array(photoFileSchema).max(8, "Можно загрузить до 8 фото за раз.");
