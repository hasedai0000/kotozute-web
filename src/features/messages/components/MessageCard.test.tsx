import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessageCard } from "./MessageCard";

describe("MessageCard", () => {
  it("renders recipient, body and always-timing badge", () => {
    render(
      <MessageCard
        id="m1"
        recipient="妻へ"
        body="いつも支えてくれてありがとう。"
        timing="always"
      />,
    );
    expect(screen.getByText("妻へ")).toBeInTheDocument();
    expect(
      screen.getByText("いつも支えてくれてありがとう。"),
    ).toBeInTheDocument();
    expect(screen.getByText("常時共有")).toBeInTheDocument();
  });

  it("renders the posthumous badge for posthumous letters", () => {
    render(
      <MessageCard
        id="m2"
        recipient="息子へ"
        body="頼みます。"
        timing="posthumous"
      />,
    );
    expect(screen.getByText("死後開示")).toBeInTheDocument();
  });

  it("wraps the card in a link to /messages/{id}", () => {
    render(
      <MessageCard id="m1" recipient="妻へ" body="a" timing="always" />,
    );
    const link = screen.getByRole("link", { name: "妻へ を読む" });
    expect(link).toHaveAttribute("href", "/messages/m1");
  });

  it("does not render edit/delete buttons in list mode", () => {
    render(
      <MessageCard id="m1" recipient="妻へ" body="a" timing="always" />,
    );
    expect(screen.queryByRole("button", { name: /編集/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /削除/ })).toBeNull();
  });
});
