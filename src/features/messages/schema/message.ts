import type { TimingVariant } from "@/features/notebook/components/TimingBadge";

// TODO(#20+): OpenAPI に /messages が定義され次第、src/types/generated から型を差し替える。
export type Message = {
  id: string;
  recipient: string;
  body: string;
  timing: TimingVariant;
  updated_at?: string;
};
