import { z } from "zod";

import type { TimingVariant } from "@/features/notebook/components/TimingBadge";

// TODO(#20+): OpenAPI に /messages が定義され次第、src/types/generated から型を差し替える。
export type Message = {
  id: string;
  recipient: string;
  body: string;
  timing: TimingVariant;
  updated_at?: string;
};

export const RECIPIENT_MAX = 50;
export const BODY_MAX = 2000;

// 書き途中を保存できるように min(1) は課さない。最終的な必須検証はバック側に委ねる。
export const messageInputSchema = z.object({
  recipient: z.string().max(RECIPIENT_MAX, {
    message: `宛先は ${RECIPIENT_MAX} 文字以内で入力してください`,
  }),
  body: z.string().max(BODY_MAX, {
    message: `本文は ${BODY_MAX} 文字以内で入力してください`,
  }),
  timing: z.enum(["always", "posthumous"]),
});

export type MessageInput = z.infer<typeof messageInputSchema>;
