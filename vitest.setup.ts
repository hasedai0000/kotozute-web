import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest の globals=false のため、RTL の自動クリーンアップが働かない。
// 各テスト後に DOM をリセットして、同一ファイル内の複数 render が
// 互いに干渉しないようにする。
afterEach(() => {
  cleanup();
});
