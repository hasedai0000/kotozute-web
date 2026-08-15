// CLAUDE.md セキュリティ: パスワード・暗証番号・マイナンバー等は入力させない。
// 「在りかのみ」の設計方針に反する key を section-fields / entry-fields の両方で拒否する
// ため、単一の真実として集約する。追加は必ずここに寄せる。
export const FORBIDDEN_KEYS: readonly string[] = [
  "password",
  "pass",
  "passwd",
  "pin",
  "pincode",
  "cvv",
  "cvc",
  "mynumber",
  "my_number",
  "social_security",
  "credit_card",
  "card_number",
  "secret",
];

export function assertNoSensitiveKey(key: string): void {
  if (FORBIDDEN_KEYS.includes(key)) {
    throw new Error(
      `[sensitive-keys] "${key}" は機微情報のため受け付けません（CLAUDE.md セキュリティ）`,
    );
  }
}
