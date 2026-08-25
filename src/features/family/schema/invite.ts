import { z } from "zod";

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const EMPTY_INVITE_VALUES: InviteInput = { email: "" };
