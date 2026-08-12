import { ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type SectionSensitiveNoticeProps = {
  className?: string;
};

export function SectionSensitiveNotice({
  className,
}: SectionSensitiveNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-transparent",
        "bg-timing-posthumous/20 text-timing-posthumous-foreground",
        "px-3 py-2 text-sm",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        暗証番号・パスワード・マイナンバーは入力しないでください。ここには「在りか」だけを残します。
      </p>
    </div>
  );
}
