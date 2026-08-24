"use client";

import { useState } from "react";

import { SECTION_ORDER } from "@/features/notebook/constants/sections";

import { PreviewMessages } from "./PreviewMessages";
import { PreviewSection } from "./PreviewSection";
import { PreviewToolbar } from "./PreviewToolbar";

// TODO(#audit): screen_spec §8「出力は audit_logs に記録」に対応する
// mutation を API 側で用意でき次第、印刷ボタン押下時に叩く。MVP はフロント側では記録しない。

export function PreviewContent() {
  const [showUnfilled, setShowUnfilled] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 print:max-w-none print:p-0">
      <header className="flex flex-col gap-1 print:hidden">
        <h1 className="text-2xl font-semibold text-foreground">
          プレビュー・書き出し
        </h1>
        <p className="text-sm text-muted-foreground">
          ノート全体を通しで確認し、紙で残す手段を提供します。印刷 / PDF 保存はブラウザの機能で行います。
        </p>
      </header>

      <PreviewToolbar
        showUnfilled={showUnfilled}
        onShowUnfilledChange={setShowUnfilled}
      />

      <div className="flex flex-col gap-10">
        {SECTION_ORDER.map((slug, index) => (
          <PreviewSection
            key={slug}
            slug={slug}
            showUnfilled={showUnfilled}
            isFirst={index === 0}
          />
        ))}
        <PreviewMessages showUnfilled={showUnfilled} />
      </div>
    </div>
  );
}
