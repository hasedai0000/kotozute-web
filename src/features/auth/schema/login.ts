import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "メールアドレスの形式が正しくありません" }),
  password: z.string().min(1, { message: "パスワードを入力してください" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
