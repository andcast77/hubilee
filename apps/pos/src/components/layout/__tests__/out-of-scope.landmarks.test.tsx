import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";

vi.mock("@/lib/next-nav", () => ({
  Link: ({ children, to, href, ...props }: any) => (
    <a href={to ?? href ?? "/"} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/" }),
}));

vi.mock("@/lib/landingUrls", () => ({
  getLandingUrls: () => ({
    hub: "http://localhost:3001",
    pos: "http://localhost:3002",
    hr: "http://localhost:3003",
    tech: "http://localhost:3004",
  }),
}));

import { LandingPage } from "@/views/LandingPage";
import { PageFrame } from "@/views/PageFrame";
import { AdminListToolbar } from "@/components/admin/AdminListToolbar";

describe("Out-of-scope shell / list landmarks", () => {
  afterEach(() => {
    cleanup();
  });

  it("landing page does not render admin shell landmarks", () => {
    render(<LandingPage />);
    expect(screen.queryByTestId("admin-header")).toBeNull();
    expect(screen.queryByTestId("admin-canvas")).toBeNull();
    expect(screen.queryByTestId("content-card")).toBeNull();
  });

  it("checkout PageFrame does not force admin list toolbar pattern", () => {
    render(
      <PageFrame title="Punto de Venta">
        <div data-testid="pos-checkout-panel">
          <h2>POS</h2>
          <p>Checkout composition</p>
        </div>
      </PageFrame>,
    );
    expect(screen.getByTestId("content-card")).not.toBeNull();
    expect(screen.getByTestId("pos-checkout-panel")).not.toBeNull();
    expect(screen.queryByPlaceholderText(/Buscar/i)).toBeNull();
    expect(screen.queryByText(/Crear /i)).toBeNull();
  });

  it("AdminListToolbar is the list-pattern landmark (not used by checkout smoke)", () => {
    render(
      <AdminListToolbar
        search={{ value: "", onChange: () => {}, placeholder: "Buscar clientes..." }}
        primaryAction={{ label: "Crear Cliente", href: "/customers/new" }}
      />,
    );
    expect(screen.getByPlaceholderText("Buscar clientes...")).not.toBeNull();
    expect(screen.getByText("Crear Cliente")).not.toBeNull();
  });
});
