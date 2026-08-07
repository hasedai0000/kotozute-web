import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "お名前を入力してください" })
      .max(100, { message: "お名前は100文字以内で入力してください" }),
    email: z
      .string()
      .min(1, { message: "メールアドレスを入力してください" })
      .email({ message: "メールアドレスの形式が正しくありません" }),
    password: z
      .string()
      .min(1, { message: "パスワードを入力してください" })
      .min(8, { message: "パスワードは8文字以上で入力してください" }),
    passwordConfirmation: z
      .string()
      .min(1, { message: "確認用パスワードを入力してください" }),
  })
  .refine((v) => v.password === v.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "パスワードが一致しません",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
