import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";

import { SoftStatusPill } from "../SoftStatusPill";

describe("SoftStatusPill", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders status label", () => {
    render(<SoftStatusPill status="active" />);
    expect(screen.getByText("active")).not.toBeNull();
  });

  it("renders custom label when provided", () => {
    render(<SoftStatusPill status="active" label="Activo" />);
    expect(screen.getByText("Activo")).not.toBeNull();
    expect(screen.queryByText("active")).toBeNull();
  });

  it("sets data-status=active for active status", () => {
    render(<SoftStatusPill status="active" />);
    const pill = screen.getByTestId("soft-status-pill");
    expect(pill.getAttribute("data-status")).toBe("active");
    expect(pill.className).toContain("soft-status-pill");
  });

  it("sets data-status=inactive for inactive status", () => {
    render(<SoftStatusPill status="inactive" />);
    expect(screen.getByTestId("soft-status-pill").getAttribute("data-status")).toBe(
      "inactive",
    );
  });

  it("sets data-status=pending for pending status", () => {
    render(<SoftStatusPill status="pending" />);
    expect(screen.getByTestId("soft-status-pill").getAttribute("data-status")).toBe(
      "pending",
    );
  });

  it("normalizes unknown status for fallback styling", () => {
    render(<SoftStatusPill status="unknown_value" />);
    const pill = screen.getByTestId("soft-status-pill");
    expect(pill.getAttribute("data-status")).toBe("unknown_value");
    expect(pill.className).toContain("soft-status-pill");
  });

  it("renders a colored dot indicator", () => {
    render(<SoftStatusPill status="active" />);
    const pill = screen.getByTestId("soft-status-pill");
    const dot = pill.querySelector(".soft-status-pill__dot");
    expect(dot).not.toBeNull();
  });
});
