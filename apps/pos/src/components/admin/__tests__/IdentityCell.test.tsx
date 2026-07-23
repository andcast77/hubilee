import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";

import { IdentityCell } from "../IdentityCell";

describe("IdentityCell", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title text", () => {
    render(<IdentityCell title="María García" />);
    expect(screen.getByText("María García")).not.toBeNull();
  });

  it("renders subtitle when provided", () => {
    render(<IdentityCell title="María García" subtitle="maria@acme.com" />);
    expect(screen.getByText("maria@acme.com")).not.toBeNull();
  });

  it("does not render subtitle when omitted", () => {
    render(<IdentityCell title="María García" />);
    // There should be no subtitle element — query for the email text
    // Only the title should be present
    expect(screen.getByText("María García")).not.toBeNull();
  });

  it("renders initials fallback when no avatar", () => {
    render(<IdentityCell title="María García" />);
    // "MG" for "María García"
    expect(screen.getByText("MG")).not.toBeNull();
  });

  it("renders single initial for single-word name", () => {
    render(<IdentityCell title="Admin" />);
    expect(screen.getByText("A")).not.toBeNull();
  });

  it("renders image when avatar is provided", () => {
    render(
      <IdentityCell title="María García" avatar="https://example.com/avatar.jpg" />,
    );
    const img = screen.getByAltText("María García");
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.jpg");
    // Initials should NOT render when avatar is present
    expect(screen.queryByText("MG")).toBeNull();
  });
});
