import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";

import type { Message } from "@/features/messages/schema/message";
import { queryKeys } from "@/lib/query/queryKeys";

import { PreviewMessages } from "./PreviewMessages";

function seed(messages: Message[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(queryKeys.messages.list, { messages });
  return client;
}

function wrap(client: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("PreviewMessages", () => {
  it("marks the heading as （未記入） when no messages exist and showUnfilled is false", () => {
    const client = seed([]);
    render(<PreviewMessages showUnfilled={false} />, { wrapper: wrap(client) });
    expect(screen.getByText("大切な人へ")).toBeInTheDocument();
    expect(screen.getByText("（未記入）")).toBeInTheDocument();
  });

  it("shows a （登録がありません） line when showUnfilled is true and empty", () => {
    const client = seed([]);
    render(<PreviewMessages showUnfilled={true} />, { wrapper: wrap(client) });
    expect(screen.getByText("（登録がありません）")).toBeInTheDocument();
  });

  it("renders each letter with its timing badge", () => {
    const client = seed([
      {
        id: "m1",
        recipient: "妻へ",
        body: "ありがとう。",
        timing: "posthumous",
      },
      { id: "m2", recipient: "娘へ", body: "元気で。", timing: "always" },
    ]);
    render(<PreviewMessages showUnfilled={false} />, { wrapper: wrap(client) });
    expect(screen.getByText("妻へ")).toBeInTheDocument();
    expect(screen.getByText("娘へ")).toBeInTheDocument();
    expect(screen.getByLabelText("死後開示")).toBeInTheDocument();
    expect(screen.getByLabelText("常時共有")).toBeInTheDocument();
  });
});
