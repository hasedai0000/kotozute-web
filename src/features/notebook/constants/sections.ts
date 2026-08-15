// CategorySlug は categories.ts 側の CATEGORY_SLUGS から派生する型。
// categories.ts が sections.ts の FIELD_KEY_PATTERN を実行時に参照するため、
// こちらは import type にとどめて循環参照を避ける。
import type { CategorySlug } from "./categories";

export const SECTION_SLUGS = [
  "basic",
  "medical",
  "money",
  "digital",
  "funeral",
  "pet",
  "other",
] as const;

export type SectionSlug = (typeof SECTION_SLUGS)[number];

export type FieldKind = "text" | "textarea" | "date";

export type FieldDefinition = {
  key: string;
  label: string;
  kind: FieldKind;
  maxLength?: number;
  placeholder?: string;
  note?: string;
};

export type SectionDefinition = {
  slug: SectionSlug;
  label: string;
  description: string;
  sensitive?: boolean;
  fields: readonly FieldDefinition[];
  entryCategories: readonly CategorySlug[];
};

// key の命名規則。Zod スキーマのプロパティ名になるため英数と _ のみ許可。
export const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export const SECTIONS: Record<SectionSlug, SectionDefinition> = {
  basic: {
    slug: "basic",
    label: "基本のこと",
    description:
      "氏名・生年月日・血液型・緊急連絡先など、家族がすぐ確認したい基本の情報を残します。",
    fields: [
      {
        key: "full_name",
        label: "氏名",
        kind: "text",
        maxLength: 60,
        placeholder: "山田 太郎",
      },
      {
        key: "birthdate",
        label: "生年月日",
        kind: "date",
      },
      {
        key: "blood_type",
        label: "血液型",
        kind: "text",
        maxLength: 8,
        placeholder: "A / B / O / AB（Rh も添えて可）",
      },
      {
        key: "emergency_contact",
        label: "緊急連絡先",
        kind: "textarea",
        maxLength: 200,
        note: "氏名・続柄・電話番号など、家族がすぐ連絡できる相手を書いてください。",
      },
    ],
    entryCategories: [],
  },
  medical: {
    slug: "medical",
    label: "医療のこと",
    description:
      "かかりつけ医、服用中の薬、延命治療への希望など、医療にまつわる意向を残します。",
    fields: [],
    entryCategories: [],
  },
  money: {
    slug: "money",
    label: "お金のこと",
    description:
      "銀行口座・保険・不動産・借入などの在りかを残します。暗証番号やパスワードは書きません。",
    sensitive: true,
    fields: [],
    entryCategories: ["bank_account", "insurance", "property", "loan"],
  },
  digital: {
    slug: "digital",
    label: "デジタルのこと",
    description:
      "オンラインサービスのアカウントや定期購読の在りかを残します。パスワードは書きません。",
    sensitive: true,
    fields: [],
    entryCategories: ["account", "subscription"],
  },
  funeral: {
    slug: "funeral",
    label: "葬儀・お墓のこと",
    description:
      "葬儀の形式、宗派、連絡してほしい人、お墓の場所など、送られ方についての希望を残します。",
    fields: [],
    entryCategories: [],
  },
  pet: {
    slug: "pet",
    label: "ペットのこと",
    description:
      "ペットの名前・動物病院・世話の方法・託したい人など、家族が困らないよう情報を残します。",
    fields: [],
    entryCategories: ["pet"],
  },
  other: {
    slug: "other",
    label: "その他",
    description:
      "上のどれにも当てはまらない、家族に伝えておきたいことを自由に残します。",
    fields: [],
    entryCategories: [],
  },
};

export const SECTION_ORDER: readonly SectionSlug[] = SECTION_SLUGS;
