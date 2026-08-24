import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { FieldDefinition } from "@/features/notebook/constants/sections";

import { PreviewFields } from "./PreviewFields";

const FIELDS: readonly FieldDefinition[] = [
  { key: "full_name", label: "氏名", kind: "text" },
  { key: "blood_type", label: "血液型", kind: "text" },
];

describe("PreviewFields", () => {
  it("shows only filled fields when showUnfilled is false", () => {
    render(
      <PreviewFields
        fields={FIELDS}
        values={{ full_name: "山田 太郎" }}
        showUnfilled={false}
      />,
    );
    expect(screen.getByText("氏名")).toBeInTheDocument();
    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    expect(screen.queryByText("血液型")).not.toBeInTheDocument();
  });

  it("shows all fields with a placeholder for empties when showUnfilled is true", () => {
    render(
      <PreviewFields
        fields={FIELDS}
        values={{ full_name: "山田 太郎" }}
        showUnfilled={true}
      />,
    );
    expect(screen.getByText("血液型")).toBeInTheDocument();
    expect(screen.getByText("（未記入）")).toBeInTheDocument();
  });

  it("renders nothing when no fields are filled and showUnfilled is false", () => {
    const { container } = render(
      <PreviewFields fields={FIELDS} values={{}} showUnfilled={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("treats whitespace-only values as unfilled", () => {
    render(
      <PreviewFields
        fields={FIELDS}
        values={{ full_name: "   " }}
        showUnfilled={false}
      />,
    );
    expect(screen.queryByText("氏名")).not.toBeInTheDocument();
  });
});
