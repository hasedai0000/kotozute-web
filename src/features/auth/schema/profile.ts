import { z } from "zod";

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "お名前を入力してください" })
    .max(100, { message: "お名前は100文字以内で入力してください" }),
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "メールアドレスの形式が正しくありません" }),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
