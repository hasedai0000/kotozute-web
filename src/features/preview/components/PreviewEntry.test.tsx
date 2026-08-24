import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { NoteEntry } from "@/features/notebook/api/useEntries";

import { PreviewEntry } from "./PreviewEntry";

describe("PreviewEntry", () => {
  it("uses the category primaryKey as the entry title", () => {
    const entry: NoteEntry = {
      id: "e1",
      category: "bank_account",
      values: { bank_name: "みらい銀行", branch: "本店" },
      timing: "always",
    };
    render(<PreviewEntry entry={entry} />);
    expect(screen.getByText("みらい銀行")).toBeInTheDocument();
    expect(screen.getByText("本店")).toBeInTheDocument();
  });

  it("resolves select values to their labels", () => {
    const entry: NoteEntry = {
      id: "e2",
      category: "bank_account",
      values: { bank_name: "みらい銀行", account_type: "futsu" },
      timing: "always",
    };
    render(<PreviewEntry entry={entry} />);
    expect(screen.getByText("普通")).toBeInTheDocument();
    expect(screen.queryByText("futsu")).not.toBeInTheDocument();
  });

  it("renders a lock badge for posthumous timing", () => {
    const entry: NoteEntry = {
      id: "e3",
      category: "account",
      values: { service_name: "SNS" },
      timing: "posthumous",
    };
    render(<PreviewEntry entry={entry} />);
    expect(screen.getByLabelText("死後開示")).toBeInTheDocument();
  });

  it("falls back to （未記入） when the primary value is missing", () => {
    const entry: NoteEntry = {
      id: "e4",
      category: "pet",
      values: {},
      timing: "always",
    };
    render(<PreviewEntry entry={entry} />);
    // 見出しの中に「（未記入）」が出る
    expect(screen.getAllByText(/（未記入）/).length).toBeGreaterThan(0);
  });
});
