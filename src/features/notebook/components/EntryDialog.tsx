"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  CATEGORIES,
  type CategoryFieldDefinition,
  type CategorySlug,
} from "../constants/categories";
import {
  buildEntryDefaultValues,
  buildEntrySchema,
} from "../schema/entry-fields";

import { SectionSensitiveNotice } from "./SectionSensitiveNotice";

// TODO(#23): 保存の主体はここに置かない。onSubmit を親に渡し、useAddEntry /
// useUpdateEntry での楽観的更新と mutation は #23 で親側に実装する。
// TODO(#24): レコード単位の timing 選択 UI は #24 で追加する。EntryDialog 側は
// onSubmit の values にキーが増えても壊れないよう、Record<string, string> の
// ままインターフェースを保つ。

export type EntryDialogMode = "create" | "edit";

export type EntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategorySlug;
  initial?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
  sensitive?: boolean;
  mode?: EntryDialogMode;
};

export function EntryDialog({
  open,
  onOpenChange,
  category,
  initial,
  onSubmit,
  sensitive,
  mode = "create",
}: EntryDialogProps) {
  const def = CATEGORIES[category];

  const schema = useMemo(() => buildEntrySchema(category), [category]);
  const defaults = useMemo(
    () => buildEntryDefaultValues(category, initial),
    [category, initial],
  );

  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: "onChange",
  });

  // 開いた瞬間だけリセット。open 中の再入力は保持する。
  useEffect(() => {
    if (open) {
      form.reset(defaults);
    }
    // defaults は category / initial から派生。open の立ち上がりで一度だけ反映する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category, initial]);

  const handle = form.handleSubmit((values) => {
    onSubmit(values);
    onOpenChange(false);
  });

  const title = `${def.label} を${mode === "edit" ? "編集" : "追加"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {def.label}の項目を入力します。必須の項目には * が付いています。
          </DialogDescription>
        </DialogHeader>
        {sensitive ? <SectionSensitiveNotice /> : null}
        <Form {...form}>
          <form
            noValidate
            onSubmit={handle}
            className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto"
          >
            {def.fields.map((f) => (
              <FormField
                key={f.key}
                control={form.control}
                name={f.key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {f.label}
                      {f.required ? (
                        <span
                          aria-hidden="true"
                          className="text-destructive"
                        >
                          {" "}
                          *
                        </span>
                      ) : null}
                    </FormLabel>
                    <FormControl>
                      <EntryFieldControl field={f} controller={field} />
                    </FormControl>
                    {f.helperText ? (
                      <FormDescription>{f.helperText}</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </form>
        </Form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button type="button" onClick={handle}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ControllerField = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

// FormControl は Slot.Root で直下の要素に id / aria を merge するため、
// forwardRef で props を透過させる必要がある。
const EntryFieldControl = forwardRef<
  HTMLElement,
  {
    field: CategoryFieldDefinition;
    controller: ControllerField;
  } & React.HTMLAttributes<HTMLElement>
>(function EntryFieldControl({ field, controller, ...slotProps }, ref) {
  switch (field.kind) {
    case "textarea":
      return (
        <Textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          rows={3}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          name={controller.name}
          value={controller.value}
          onChange={(e) => controller.onChange(e.target.value)}
          onBlur={controller.onBlur}
          {...(slotProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    case "select": {
      const options = field.options ?? [];
      return (
        <Select
          value={controller.value}
          onValueChange={(value) => controller.onChange((value ?? "") as string)}
        >
          <SelectTrigger
            ref={ref as React.Ref<HTMLButtonElement>}
            className="w-full"
            {...(slotProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <SelectValue placeholder="選択してください" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "digits4":
      return (
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          name={controller.name}
          value={controller.value}
          onChange={(e) => controller.onChange(e.target.value)}
          onBlur={controller.onBlur}
          {...(slotProps as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      );
    case "text":
    default:
      return (
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          type="text"
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          name={controller.name}
          value={controller.value}
          onChange={(e) => controller.onChange(e.target.value)}
          onBlur={controller.onBlur}
          {...(slotProps as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      );
  }
});
