"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import { useNoteFields } from "../api/useNoteFields";
import { usePatchNoteFields } from "../api/usePatchNoteFields";
import {
  SECTIONS,
  type FieldDefinition,
  type SectionSlug,
} from "../constants/sections";
import { useAutoSave, type AutoSaveStatus } from "../hooks/useAutoSave";
import {
  buildDefaultValues,
  buildSectionFieldsSchema,
} from "../schema/section-fields";

import { SavingIndicator } from "./SavingIndicator";

// TODO(role): 家族ロール（family）は編集 UI を出さない。role 判定は別 Issue で
// useAuth から取り、SectionForm 全体を出し分けるか読み取り専用ビューに切り替える。

type SectionFormProps = {
  slug: SectionSlug;
};

const SAVE_ERROR_TOAST = "保存できませんでした。時間をおいて再度お試しください";

export function SectionForm({ slug }: SectionFormProps) {
  const def = SECTIONS[slug];
  if (def.fields.length === 0) {
    return null;
  }
  return <SectionFormLoader slug={slug} fields={def.fields} label={def.label} />;
}

function SectionFormLoader({
  slug,
  fields,
  label,
}: {
  slug: SectionSlug;
  fields: readonly FieldDefinition[];
  label: string;
}) {
  const query = useNoteFields(slug);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // データが揃ってからフォーム本体をマウントする。以降 initial の識別は変えない。
  return (
    <SectionFormBody
      slug={slug}
      fields={fields}
      label={label}
      initial={query.data?.fields ?? {}}
    />
  );
}

function SectionFormBody({
  slug,
  fields,
  label,
  initial,
}: {
  slug: SectionSlug;
  fields: readonly FieldDefinition[];
  label: string;
  initial: Record<string, string>;
}) {
  const mutation = usePatchNoteFields(slug);

  const schema = useMemo(() => buildSectionFieldsSchema(fields), [fields]);
  const initialValues = useMemo(
    () => buildDefaultValues(fields, initial),
    // initial の識別は Loader 側で一度だけ渡す前提。中身が変わっても再初期化しない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields],
  );

  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  const auto = useAutoSave({ form, mutation, delayMs: 800 });

  // error 遷移時に一度だけトーストする（再描画の重複を防ぐ）。
  const prevStatusRef = useRef<AutoSaveStatus>(auto.status);
  useEffect(() => {
    if (auto.status === "error" && prevStatusRef.current !== "error") {
      toast.error(SAVE_ERROR_TOAST);
    }
    prevStatusRef.current = auto.status;
  }, [auto.status]);

  return (
    <section aria-label={`${label}の単一項目`} className="flex flex-col gap-4">
      <div className="flex justify-end">
        <SavingIndicator status={auto.status} onRetry={auto.retry} />
      </div>
      <Form {...form}>
        <form
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-4"
        >
          {fields.map((f) => (
            <FormField
              key={f.key}
              control={form.control}
              name={f.key}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.label}</FormLabel>
                  <FormControl>
                    {f.kind === "textarea" ? (
                      <Textarea
                        placeholder={f.placeholder}
                        maxLength={f.maxLength}
                        rows={3}
                        {...field}
                      />
                    ) : (
                      <Input
                        type={f.kind === "date" ? "date" : "text"}
                        placeholder={f.placeholder}
                        maxLength={f.maxLength}
                        {...field}
                      />
                    )}
                  </FormControl>
                  {f.note ? <FormDescription>{f.note}</FormDescription> : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </form>
      </Form>
    </section>
  );
}
