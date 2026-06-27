import { z } from "zod";

/** Validates email + password for the Supabase signInWithPassword flow. */
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Введи корректный email."),
  password: z.string().min(6, "Пароль слишком короткий.").max(128, "Пароль слишком длинный.")
});

export type SignInInput = z.infer<typeof signInSchema>;
