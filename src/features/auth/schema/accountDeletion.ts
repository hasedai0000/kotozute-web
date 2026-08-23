import { z } from "zod";

export const accountDeletionSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { message: "現在のパスワードを入力してください" }),
});

export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;
