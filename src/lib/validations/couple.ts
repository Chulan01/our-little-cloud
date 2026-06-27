import { z } from "zod";

export const createCoupleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  anniversaryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
});

export const joinCoupleSchema = z.object({
  inviteCode: z.string().trim().min(12).max(64)
});

export type CreateCoupleInput = z.infer<typeof createCoupleSchema>;
export type JoinCoupleInput = z.infer<typeof joinCoupleSchema>;
