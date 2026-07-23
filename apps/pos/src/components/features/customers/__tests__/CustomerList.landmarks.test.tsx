import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";

const useCustomersMock = vi.fn();

vi.mock("@/hooks/useCustomers", () => ({
  useCustomers: (...args: unknown[]) => useCustomersMock(...args),
  useDeleteCustomer: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/lib/next-nav", () => ({
  Link: ({ children, to, href, ...props }: any) => (
    <a href={to ?? href ?? "/"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/app/customers",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

import { CustomerList } from "../CustomerList";
import { PageFrame } from "@/views/PageFrame";

const customersData = {
  customers: [
    {
      id: "c1",
      name: "María García",
      email: "maria@acme.com",
      phone: "+525512345678",
      city: "CDMX",
      address: "Calle 1",
      state: "CDMX",
      postalCode: "06600",
      country: "MX",
      loyaltyPoints: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "c2",
      name: "Juan Pérez",
      email: "juan@acme.com",
      phone: "+525598765432",
      city: "Monterrey",
      address: "Calle 2",
      state: "NL",
      postalCode: "64000",
      country: "MX",
      loyaltyPoints: 45,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

describe("CustomerList landmarks", () => {
  afterEach(() => {
    cleanup();
    useCustomersMock.mockReset();
  });

  beforeEach(() => {
    useCustomersMock.mockReturnValue({
      data: customersData,
      isLoading: false,
      error: null,
    });
  });

  it("renders title/heading", () => {
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    const heading = screen.getByText("Clientes");
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H1");
  });

  it("renders search input", () => {
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    expect(screen.getByPlaceholderText("Buscar clientes...")).not.toBeNull();
  });

  it("renders CTA button with text 'Crear Cliente'", () => {
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    expect(screen.getByText("Crear Cliente")).not.toBeNull();
  });

  it("renders 'Activo' status pill for each customer", () => {
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    expect(screen.getAllByText("Activo").length).toBeGreaterThanOrEqual(2);
  });

  it("renders table structure with customer data rows", () => {
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    expect(screen.getByText("Cliente")).not.toBeNull();
    expect(screen.getByText("Teléfono")).not.toBeNull();
    expect(screen.getByText("Ciudad")).not.toBeNull();
    expect(screen.getByText("Estado")).not.toBeNull();
    expect(screen.getByText("María García")).not.toBeNull();
    expect(screen.getByText("Juan Pérez")).not.toBeNull();
    expect(screen.getByText("maria@acme.com")).not.toBeNull();
    expect(screen.getByText("juan@acme.com")).not.toBeNull();
  });

  it("renders icon edit/delete actions per row", () => {
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    expect(screen.getAllByRole("button", { name: "Editar" }).length).toBe(2);
    expect(screen.getAllByRole("button", { name: "Eliminar" }).length).toBe(2);
  });

  it("renders empty state landmark when there are no customers", () => {
    useCustomersMock.mockReturnValue({
      data: { customers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isLoading: false,
      error: null,
    });
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    expect(screen.getByTestId("list-empty")).not.toBeNull();
    expect(screen.getByText("No hay clientes")).not.toBeNull();
  });

  it("renders error state landmark when load fails", () => {
    useCustomersMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
    });
    render(
      <PageFrame title="Clientes">
        <CustomerList />
      </PageFrame>,
    );
    expect(screen.getByTestId("list-error")).not.toBeNull();
    expect(screen.getByText(/Error al cargar clientes/)).not.toBeNull();
  });
});
