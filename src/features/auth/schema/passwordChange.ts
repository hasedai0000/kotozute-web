import { z } from "zod";

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "現在のパスワードを入力してください" }),
    newPassword: z
      .string()
      .min(1, { message: "新しいパスワードを入力してください" })
      .min(8, { message: "パスワードは8文字以上で入力してください" }),
    newPasswordConfirmation: z
      .string()
      .min(1, { message: "確認用パスワードを入力してください" }),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirmation, {
    path: ["newPasswordConfirmation"],
    message: "パスワードが一致しません",
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
