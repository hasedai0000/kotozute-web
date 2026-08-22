"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  TimingBadge,
  type TimingVariant,
} from "@/features/notebook/components/TimingBadge";

type TimingRadioProps = {
  value: TimingVariant;
  onChange: (v: TimingVariant) => void;
  name?: string;
};

export function TimingRadio({ value, onChange, name }: TimingRadioProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange((v ?? "posthumous") as TimingVariant)}
      aria-label="公開タイミング"
      name={name}
      className="gap-3"
    >
      <Option value="always" description="家族がいつでも読めます。" />
      <Option
        value="posthumous"
        description="解放されるまで家族には見えません。"
      />
    </RadioGroup>
  );
}

function Option({
  value,
  description,
}: {
  value: TimingVariant;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <RadioGroupItem value={value} className="mt-1" />
      <div className="flex flex-col gap-1">
        <TimingBadge variant={value} />
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
