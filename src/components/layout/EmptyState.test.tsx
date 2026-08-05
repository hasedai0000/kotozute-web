import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(
      <EmptyState
        title="まだ登録がありません"
        description="口座を追加してください。"
        action={<button type="button">口座を追加</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "まだ登録がありません" }),
    ).toBeInTheDocument();
    expect(screen.getByText("口座を追加してください。")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "口座を追加" }),
    ).toBeInTheDocument();
  });
});
