// リスト項目（口座・保険等）の 1 か所集約された定義。
// screen_spec.md §2「セクション編集」→「カテゴリ別の項目（例）」の一次情報を型に落とす。
// EntryDialog（#22）／EntryCard リスト（#23）双方の唯一の真実。

import { FIELD_KEY_PATTERN } from "./sections";

export const CATEGORY_SLUGS = [
  "bank_account",
  "insurance",
  "property",
  "loan",
  "account",
  "subscription",
  "pet",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

// digits4 は「口座番号は下 4 桁のみ」を型で表現するための専用 kind。
// フル桁を書ける枠が定義上作れない。select は列挙選択。
export type CategoryFieldKind = "text" | "textarea" | "select" | "digits4";

export type CategorySelectOption = {
  value: string;
  label: string;
};

export type CategoryFieldDefinition = {
  key: string;
  label: string;
  kind: CategoryFieldKind;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  helperText?: string;
  options?: readonly CategorySelectOption[];
};

export type CategoryDefinition = {
  slug: CategorySlug;
  label: string;
  // EntryCard のタイトルに流す key。必須項目のいずれか。
  primaryKey: string;
  // EntryCard の副項目として並べる key の順序。
  metaKeys: readonly string[];
  fields: readonly CategoryFieldDefinition[];
};

// screen_spec.md §2「バリデーション」を目安に、短文=60/100、メモ=1000、連絡先=200。
export const CATEGORIES: Record<CategorySlug, CategoryDefinition> = {
  bank_account: {
    slug: "bank_account",
    label: "銀行口座",
    primaryKey: "bank_name",
    metaKeys: ["branch", "account_type", "last4"],
    fields: [
      {
        key: "bank_name",
        label: "銀行名",
        kind: "text",
        required: true,
        maxLength: 60,
        placeholder: "◯◯銀行",
      },
      {
        key: "branch",
        label: "支店",
        kind: "text",
        maxLength: 60,
        placeholder: "△△支店",
      },
      {
        key: "account_type",
        label: "種別",
        kind: "select",
        options: [
          { value: "futsu", label: "普通" },
          { value: "toza", label: "当座" },
        ],
      },
      {
        key: "last4",
        label: "口座番号（下 4 桁）",
        kind: "digits4",
        helperText:
          "下 4 桁のみを書いてください。フル桁・暗証番号・パスワードは書きません。",
      },
      {
        key: "memo",
        label: "メモ",
        kind: "textarea",
        maxLength: 1000,
        helperText:
          "家族が確認するためのメモ。暗証番号やパスワードは書かないでください。",
      },
    ],
  },
  insurance: {
    slug: "insurance",
    label: "保険",
    primaryKey: "insurer",
    metaKeys: ["insurance_kind", "policy_number"],
    fields: [
      {
        key: "insurer",
        label: "保険会社",
        kind: "text",
        required: true,
        maxLength: 60,
      },
      {
        key: "insurance_kind",
        label: "種類",
        kind: "text",
        maxLength: 60,
        placeholder: "生命保険 / 医療保険 など",
      },
      {
        key: "policy_number",
        label: "証券番号",
        kind: "text",
        maxLength: 60,
      },
      {
        key: "contact",
        label: "連絡先",
        kind: "textarea",
        maxLength: 200,
        helperText: "担当者名や電話番号など、家族が問い合わせできる先。",
      },
    ],
  },
  property: {
    slug: "property",
    label: "不動産",
    primaryKey: "address",
    metaKeys: ["property_kind"],
    fields: [
      {
        key: "address",
        label: "所在地",
        kind: "text",
        required: true,
        maxLength: 200,
      },
      {
        key: "property_kind",
        label: "種別",
        kind: "text",
        maxLength: 60,
        placeholder: "戸建 / マンション / 土地 など",
      },
      {
        key: "deed_location",
        label: "権利証の保管場所",
        kind: "textarea",
        maxLength: 200,
        helperText: "権利証や関連書類が置いてある場所。",
      },
    ],
  },
  loan: {
    slug: "loan",
    label: "借入",
    primaryKey: "lender",
    metaKeys: ["loan_kind", "balance_estimate"],
    fields: [
      {
        key: "lender",
        label: "借入先",
        kind: "text",
        required: true,
        maxLength: 60,
      },
      {
        key: "loan_kind",
        label: "種類",
        kind: "text",
        maxLength: 60,
        placeholder: "住宅ローン / カードローン など",
      },
      {
        key: "balance_estimate",
        label: "残高目安",
        kind: "text",
        maxLength: 60,
        helperText: "正確な金額でなくて構いません。目安で十分です。",
      },
      {
        key: "contact",
        label: "連絡先",
        kind: "textarea",
        maxLength: 200,
      },
    ],
  },
  account: {
    slug: "account",
    label: "オンラインアカウント",
    primaryKey: "service_name",
    metaKeys: ["account_id", "aftermath"],
    fields: [
      {
        key: "service_name",
        label: "サービス名",
        kind: "text",
        required: true,
        maxLength: 60,
      },
      {
        key: "account_id",
        label: "ID",
        kind: "text",
        maxLength: 100,
        helperText:
          "ログイン ID やメールアドレスのみ。パスワードは書かないでください。",
      },
      {
        key: "aftermath",
        label: "死後の希望",
        kind: "select",
        options: [
          { value: "delete", label: "削除してほしい" },
          { value: "keep", label: "残してほしい" },
          { value: "memorial", label: "追悼アカウントにしてほしい" },
        ],
      },
    ],
  },
  subscription: {
    slug: "subscription",
    label: "定期購読",
    primaryKey: "service_name",
    metaKeys: ["monthly_fee"],
    fields: [
      {
        key: "service_name",
        label: "サービス名",
        kind: "text",
        required: true,
        maxLength: 60,
      },
      {
        key: "monthly_fee",
        label: "料金",
        kind: "text",
        maxLength: 60,
        placeholder: "月額 ◯◯円 など",
      },
      {
        key: "cancel_procedure",
        label: "解約方法",
        kind: "textarea",
        maxLength: 1000,
        helperText:
          "解約手順や連絡先を書きます。パスワードは書かないでください。",
      },
    ],
  },
  pet: {
    slug: "pet",
    label: "ペット",
    primaryKey: "name",
    metaKeys: ["species", "veterinary"],
    fields: [
      {
        key: "name",
        label: "名前",
        kind: "text",
        required: true,
        maxLength: 60,
      },
      {
        key: "species",
        label: "種類",
        kind: "text",
        maxLength: 60,
        placeholder: "犬 / 猫 / うさぎ など",
      },
      {
        key: "veterinary",
        label: "動物病院",
        kind: "textarea",
        maxLength: 200,
        helperText: "かかりつけの病院名・連絡先。",
      },
      {
        key: "care_notes",
        label: "世話の方法",
        kind: "textarea",
        maxLength: 1000,
        helperText: "食事・散歩・服薬など、家族が困らないよう詳しく。",
      },
      {
        key: "entrusted_to",
        label: "託したい人",
        kind: "textarea",
        maxLength: 200,
        helperText: "託したい人の氏名・続柄・連絡先。",
      },
    ],
  },
};

// primaryKey / metaKeys / options が実在キーを指しているかを起動時に検査する。
// 静的に catch できないので、モジュール読み込み時に一度だけ回して壊れた定数を防ぐ。
for (const slug of CATEGORY_SLUGS) {
  const def = CATEGORIES[slug];
  const keys = new Set(def.fields.map((f) => f.key));
  for (const field of def.fields) {
    if (!FIELD_KEY_PATTERN.test(field.key)) {
      throw new Error(
        `[categories] "${slug}.${field.key}" は FIELD_KEY_PATTERN に反します`,
      );
    }
    if (field.kind === "select") {
      if (!field.options || field.options.length === 0) {
        throw new Error(
          `[categories] "${slug}.${field.key}" は select ですが options が未定義です`,
        );
      }
    }
  }
  if (!keys.has(def.primaryKey)) {
    throw new Error(
      `[categories] "${slug}.primaryKey=${def.primaryKey}" は fields に存在しません`,
    );
  }
  for (const metaKey of def.metaKeys) {
    if (!keys.has(metaKey)) {
      throw new Error(
        `[categories] "${slug}.metaKeys" に fields に存在しない "${metaKey}" が含まれます`,
      );
    }
  }
}
