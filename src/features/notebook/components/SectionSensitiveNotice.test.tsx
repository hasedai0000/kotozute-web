import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionSensitiveNotice } from "./SectionSensitiveNotice";

describe("SectionSensitiveNotice", () => {
  it("role='note' で機微情報の警告文が描画される", () => {
    render(<SectionSensitiveNotice />);
    const note = screen.getByRole("note");
    expect(note).toBeInTheDocument();
    expect(note).toHaveTextContent(/暗証番号/);
    expect(note).toHaveTextContent(/パスワード/);
  });
});
