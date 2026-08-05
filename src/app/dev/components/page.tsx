"use client";

import { useState } from "react";
import { Inbox, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { EntryCard } from "@/features/notebook/components/EntryCard";
import { SectionProgress } from "@/features/notebook/components/SectionProgress";
import { TimingBadge } from "@/features/notebook/components/TimingBadge";

export default function DevComponentsPage() {
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [destructiveOpen, setDestructiveOpen] = useState(false);

  return (
    <Container as="main" className="py-10">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          共通部品カタログ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          W1-11 で追加した 5 部品の目視確認用ページ。認証不要。
        </p>
      </div>

      <div className="flex flex-col gap-10">
        <Section title="TimingBadge">
          <div className="flex flex-wrap items-center gap-3">
            <TimingBadge variant="always" />
            <TimingBadge variant="posthumous" />
          </div>
        </Section>

        <Section title="EntryCard">
          <div className="grid gap-3 md:grid-cols-2">
            <EntryCard
              title="○○銀行"
              meta={
                <div className="flex flex-col gap-0.5">
                  <span>普通 / 品川支店</span>
                  <span>下 4 桁: 1234</span>
                </div>
              }
              timing="always"
              onEdit={() => console.info("edit")}
              onDelete={() => console.info("delete")}
            />
            <EntryCard
              title="△△生命保険"
              meta="医療保険 / 証券番号 XXXX-YYY"
              timing="posthumous"
              onEdit={() => console.info("edit")}
              onDelete={() => console.info("delete")}
            />
            <EntryCard
              title="家族閲覧モード"
              meta="readOnly=true / 編集・削除ボタンは出ない"
              timing="always"
              readOnly
            />
            <EntryCard title="メタなし" timing="posthumous" readOnly />
          </div>
        </Section>

        <Section title="EmptyState">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              icon={<Inbox className="size-8" />}
              title="まだ登録がありません"
              description="口座や保険などをここに追加できます。"
              action={<Button size="sm">口座を追加</Button>}
            />
            <EmptyState
              icon={<UserPlus className="size-8" />}
              title="家族を招待しませんか"
            />
          </div>
        </Section>

        <Section title="ConfirmDialog">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setDefaultOpen(true)}>
              default を開く
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDestructiveOpen(true)}
            >
              destructive を開く
            </Button>
          </div>
          <ConfirmDialog
            open={defaultOpen}
            onOpenChange={setDefaultOpen}
            title="変更を保存しますか"
            description="この操作は後から元に戻すことができます。"
            confirmLabel="保存する"
            onConfirm={() => {
              console.info("confirmed");
            }}
          />
          <ConfirmDialog
            open={destructiveOpen}
            onOpenChange={setDestructiveOpen}
            title="この項目を削除しますか"
            description="削除するとご家族の画面からも見えなくなります。元に戻すことはできません。"
            confirmLabel="削除する"
            variant="destructive"
            onConfirm={() => {
              console.info("deleted");
            }}
          />
        </Section>

        <Section title="SectionProgress">
          <div className="flex max-w-md flex-col gap-4">
            <SectionProgress filled={0} total={10} label="お金のこと" />
            <SectionProgress filled={3} total={10} label="お金のこと" />
            <SectionProgress filled={10} total={10} label="お金のこと" />
            <SectionProgress filled={0} total={0} label="未定義（total=0）" />
          </div>
        </Section>
      </div>
    </Container>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-medium text-foreground">
        {title}
      </h2>
      <div className="rounded-xl border border-border bg-card p-4">
        {children}
      </div>
    </section>
  );
}
