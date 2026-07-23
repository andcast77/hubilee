import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";

// Mock next-nav Link — AdminListToolbar uses it for href-based actions
vi.mock("@/lib/next-nav", () => ({
  Link: ({ children, to, href, ...props }: any) => (
    <a href={to ?? href ?? "/"} {...props}>
      {children}
    </a>
  ),
}));

import { AdminListToolbar } from "../AdminListToolbar";

describe("AdminListToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders search input with placeholder and value", () => {
    const onChange = vi.fn();
    render(
      <AdminListToolbar
        search={{ value: "test", onChange, placeholder: "Buscar..." }}
      />,
    );
    const input = screen.getByPlaceholderText("Buscar...") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("test");
  });

  it("does not render search block when search prop is omitted", () => {
    render(<AdminListToolbar />);
    expect(screen.queryByPlaceholderText("Buscar...")).toBeNull();
  });

  it("renders primary action as link when href is provided", () => {
    render(
      <AdminListToolbar
        primaryAction={{ label: "Crear Cliente", href: "/customers/new" }}
      />,
    );
    const link = screen.getByText("Crear Cliente").closest("a");
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toBe("/customers/new");
  });

  it("renders primary action as button when onClick is provided", () => {
    const onClick = vi.fn();
    render(
      <AdminListToolbar
        primaryAction={{ label: "Acción", onClick }}
      />,
    );
    const btn = screen.getByText("Acción");
    expect(btn).not.toBeNull();
    btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not render primary action when omitted", () => {
    render(<AdminListToolbar search={{ value: "", onChange: vi.fn(), placeholder: "Search" }} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders filters node when provided", () => {
    render(
      <AdminListToolbar
        filters={<span data-testid="filter-tag">Filtro activo</span>}
      />,
    );
    expect(screen.getByTestId("filter-tag")).not.toBeNull();
    expect(screen.getByText("Filtro activo")).not.toBeNull();
  });

  it("triggers onChange when search input value changes", () => {
    const onChange = vi.fn();
    render(
      <AdminListToolbar
        search={{ value: "", onChange, placeholder: "Buscar..." }}
      />,
    );
    const input = screen.getByPlaceholderText("Buscar...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("abc");
  });
});
