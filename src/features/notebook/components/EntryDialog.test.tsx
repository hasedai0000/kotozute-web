import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  CATEGORIES,
  CATEGORY_SLUGS,
  type CategorySlug,
} from "../constants/categories";

import { EntryDialog } from "./EntryDialog";

type HarnessProps = {
  category: CategorySlug;
  initial?: Record<string, string>;
  sensitive?: boolean;
  onSubmit: (values: Record<string, string>) => void;
  startOpen?: boolean;
};

// EntryDialog は open/onOpenChange を親が制御する設計。テストからも同じ形で扱う。
function Harness({
  category,
  initial,
  sensitive,
  onSubmit,
  startOpen = true,
}: HarnessProps) {
  const [open, setOpen] = useState(startOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open-harness
      </button>
      <EntryDialog
        open={open}
        onOpenChange={setOpen}
        category={category}
        initial={initial}
        sensitive={sensitive}
        onSubmit={onSubmit}
      />
    </>
  );
}

const findSaveButton = () => screen.getByRole("button", { name: "保存" });

describe("EntryDialog — 全 7 カテゴリで破綻せず開閉できる (DoD)", () => {
  it.each(CATEGORY_SLUGS)("category=%s で開ける", (slug) => {
    const onSubmit = vi.fn();
    render(<Harness category={slug} onSubmit={onSubmit} />);

    // DialogTitle が category ラベルを含む
    const title = screen.getByRole("heading");
    expect(title).toHaveTextContent(CATEGORIES[slug].label);

    // カテゴリ定義の全 field が label 付きで見える（select は combobox で描画）
    for (const f of CATEGORIES[slug].fields) {
      expect(screen.getAllByText(f.label).length).toBeGreaterThan(0);
    }
  });
});

describe("EntryDialog — バリデーションと送信", () => {
  it("必須未入力で保存を押すとエラーが出て onSubmit は呼ばれない (DoD)", async () => {
    const onSubmit = vi.fn();
    render(<Harness category="bank_account" onSubmit={onSubmit} />);

    fireEvent.click(findSaveButton());

    await waitFor(() => {
      expect(screen.getByText("銀行名を入力してください")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("digits4 に 5 桁を入れると Zod のエラー文が出る", async () => {
    const onSubmit = vi.fn();
    render(<Harness category="bank_account" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/銀行名/), {
      target: { value: "○○銀行" },
    });
    fireEvent.change(screen.getByLabelText(/口座番号/), {
      target: { value: "12345" },
    });
    fireEvent.click(findSaveButton());

    await waitFor(() => {
      expect(
        screen.getByText("口座番号（下 4 桁）は半角数字 4 桁で入力してください"),
      ).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("必須のみ埋めて保存すると onSubmit がフォーム値で呼ばれる", async () => {
    const onSubmit = vi.fn();
    render(<Harness category="bank_account" onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/銀行名/), {
      target: { value: "○○銀行" },
    });
    fireEvent.click(findSaveButton());

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const values = onSubmit.mock.calls[0]?.[0] as Record<string, string>;
    expect(values.bank_name).toBe("○○銀行");
    // 未入力の任意項目は空文字で通る
    expect(values.branch).toBe("");
  });
});

describe("EntryDialog — sensitive 出し分け", () => {
  it("sensitive=true のとき role=note の注意カードが出る", () => {
    render(
      <Harness
        category="bank_account"
        sensitive
        onSubmit={() => undefined}
      />,
    );
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(/暗証番号/);
  });

  it("sensitive を渡さなければ注意カードは出ない", () => {
    render(<Harness category="pet" onSubmit={() => undefined} />);
    expect(screen.queryByRole("note")).toBeNull();
  });
});

describe("EntryDialog — 編集モードと初期値", () => {
  it("initial を渡すと既存値が入力に反映される", () => {
    render(
      <Harness
        category="bank_account"
        initial={{ bank_name: "みずほ", branch: "本店" }}
        onSubmit={() => undefined}
      />,
    );
    expect(
      (screen.getByLabelText(/銀行名/) as HTMLInputElement).value,
    ).toBe("みずほ");
    expect(
      (screen.getByLabelText(/支店/) as HTMLInputElement).value,
    ).toBe("本店");
  });
});

describe("EntryDialog — キャンセルと再オープン", () => {
  it("キャンセルで onOpenChange(false) が呼ばれ、onSubmit は呼ばれない", () => {
    const onSubmit = vi.fn();
    render(<Harness category="pet" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(onSubmit).not.toHaveBeenCalled();
    // Harness が state=false になり、DialogTitle が非表示になる
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("閉じてから再オープンすると前回値がリセットされる", () => {
    render(<Harness category="pet" onSubmit={() => undefined} />);

    const nameInput = screen.getByLabelText(/名前/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "ぽち" } });
    expect(nameInput.value).toBe("ぽち");

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    fireEvent.click(screen.getByRole("button", { name: "open-harness" }));

    const reopened = screen.getByLabelText(/名前/) as HTMLInputElement;
    expect(reopened.value).toBe("");
  });
});
