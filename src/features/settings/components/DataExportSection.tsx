import Link from "next/link";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DataExportSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">準備中</Badge>
        <span className="text-sm text-muted-foreground">
          PDF での書き出しは近日提供予定です
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        現在は、プレビュー画面から印刷（ブラウザの印刷経由で PDF 保存も可）してご利用いただけます。
      </p>
      <Button
        variant="outline"
        render={
          <Link href="/preview">
            <FileText aria-hidden="true" />
            プレビュー画面を開く
          </Link>
        }
      />
    </div>
  );
}
