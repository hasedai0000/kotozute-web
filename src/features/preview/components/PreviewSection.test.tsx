import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";

import type { NoteEntry } from "@/features/notebook/api/useEntries";
import { queryKeys } from "@/lib/query/queryKeys";

import { PreviewSection } from "./PreviewSection";

function seed(
  section: "basic" | "money",
  fields: Record<string, string>,
  entries: NoteEntry[],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(queryKeys.notebook.fields(section), { fields });
  client.setQueryData(queryKeys.notebook.entries(section), { entries });
  return client;
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("PreviewSection", () => {
  it("shows a （未記入） marker on the heading when the section is empty and showUnfilled is false", () => {
    const client = seed("basic", {}, []);
    render(<PreviewSection slug="basic" showUnfilled={false} isFirst />, {
      wrapper: wrap(client),
    });
    expect(screen.getByText("基本のこと")).toBeInTheDocument();
    expect(screen.getByText("（未記入）")).toBeInTheDocument();
  });

  it("hides the （未記入） marker once any field is filled", () => {
    const client = seed("basic", { full_name: "山田 太郎" }, []);
    render(<PreviewSection slug="basic" showUnfilled={false} isFirst />, {
      wrapper: wrap(client),
    });
    expect(screen.queryByText("（未記入）")).not.toBeInTheDocument();
    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
  });

  it("renders entries with their timing badges", () => {
    const client = seed(
      "money",
      {},
      [
        {
          id: "e1",
          category: "bank_account",
          values: { bank_name: "みらい銀行" },
          timing: "always",
        },
        {
          id: "e2",
          category: "insurance",
          values: { insurer: "みらい保険" },
          timing: "posthumous",
        },
      ],
    );
    render(<PreviewSection slug="money" showUnfilled={false} isFirst />, {
      wrapper: wrap(client),
    });
    expect(screen.getByText("みらい銀行")).toBeInTheDocument();
    expect(screen.getByText("みらい保険")).toBeInTheDocument();
    // posthumous エントリの鍵バッジが 1 つだけ出る（always は出ない）
    expect(screen.getAllByLabelText("死後開示")).toHaveLength(1);
    expect(screen.getAllByLabelText("常時共有")).toHaveLength(1);
  });

  it("does not synthesise posthumous entries the API never returned (family-role safety)", () => {
    // 家族ロール相当：API が posthumous を一切返さない場合、フロント側でも 1 つも出ない。
    const client = seed(
      "money",
      {},
      [
        {
          id: "e1",
          category: "bank_account",
          values: { bank_name: "みらい銀行" },
          timing: "always",
        },
      ],
    );
    render(<PreviewSection slug="money" showUnfilled={false} isFirst />, {
      wrapper: wrap(client),
    });
    expect(screen.queryByLabelText("死後開示")).not.toBeInTheDocument();
  });

  it("applies print:break-before-page unless isFirst", () => {
    const client = seed("basic", { full_name: "山田" }, []);
    const { container } = render(
      <PreviewSection slug="basic" showUnfilled={false} />,
      { wrapper: wrap(client) },
    );
    const section = container.querySelector("section");
    expect(section?.className).toContain("print:break-before-page");
  });
});
