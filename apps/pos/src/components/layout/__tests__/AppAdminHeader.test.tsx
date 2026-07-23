import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";

import { AppAdminHeader } from "../AppAdminHeader";

describe("AppAdminHeader", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders admin header landmark", () => {
    render(<AppAdminHeader />);
    expect(screen.getByTestId("admin-header")).not.toBeNull();
  });

  describe("bell notification badge", () => {
    it("shows badge when unreadCount > 0", () => {
      render(<AppAdminHeader unreadCount={5} />);
      const badge = screen.getByTestId("notification-badge");
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe("5");
    });

    it("caps badge at 99+ when unreadCount exceeds 99", () => {
      render(<AppAdminHeader unreadCount={150} />);
      expect(screen.getByText("99+")).not.toBeNull();
    });

    it("does not render badge when unreadCount is 0", () => {
      render(<AppAdminHeader unreadCount={0} />);
      const bellButton = screen.getByRole("button", {
        name: "Notificaciones",
      });
      expect(bellButton).not.toBeNull();
      expect(screen.queryByTestId("notification-badge")).toBeNull();
    });
  });

  describe("user button", () => {
    it("renders with default aria-label when no userName", () => {
      render(<AppAdminHeader />);
      const userButton = screen.getByRole("button", { name: "Usuario" });
      expect(userButton).not.toBeNull();
    });

    it("includes userName in aria-label when provided", () => {
      render(<AppAdminHeader userName="Juan Pérez" />);
      const userButton = screen.getByRole("button", {
        name: "Usuario: Juan Pérez",
      });
      expect(userButton).not.toBeNull();
    });
  });

  describe("hamburger menu button", () => {
    it("does not render when showMenuButton is false (default)", () => {
      render(<AppAdminHeader />);
      expect(
        screen.queryByRole("button", { name: "Abrir menú" }),
      ).toBeNull();
    });

    it("renders mobile menu button when showMenuButton is true", () => {
      const onToggle = vi.fn();
      render(<AppAdminHeader showMenuButton onMenuToggle={onToggle} />);
      const menuButton = screen.getByRole("button", {
        name: "Abrir menú",
      });
      expect(menuButton).not.toBeNull();
      menuButton.click();
      expect(onToggle).toHaveBeenCalledOnce();
    });
  });
});
