import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";

// ---------------------------------------------------------------------------
// Shared mocks (hoisted before all imports)
// ---------------------------------------------------------------------------

vi.mock("@/lib/next-nav", () => ({
  Link: ({ children, to, href, ...props }: any) => (
    <a href={to ?? href ?? "/"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to ?? "/"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/app/products",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: vi.fn((opts: { queryKey: string[]; queryFn?: () => any }) => {
    if (opts.queryKey[0] === "backups") {
      return {
        data: [
          {
            id: "b1",
            filename: "backup-2024-01-01.sql",
            createdAt: new Date("2024-01-01T12:00:00Z"),
            size: 1048576,
            type: "database" as const,
            format: "sql" as const,
          },
          {
            id: "b2",
            filename: "backup-2024-01-02.sql",
            createdAt: new Date("2024-01-02T12:00:00Z"),
            size: 2097152,
            type: "database" as const,
            format: "sql" as const,
          },
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: null, isLoading: false, error: null, refetch: vi.fn() };
  }),
  useMutation: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

vi.mock("@/lib/services/backupApiService", () => ({
  getBackupList: vi.fn().mockResolvedValue([
    {
      id: "b1",
      filename: "backup-2024-01-01.sql",
      createdAt: new Date("2024-01-01T12:00:00Z"),
      size: 1048576,
      type: "database" as const,
      format: "sql" as const,
    },
    {
      id: "b2",
      filename: "backup-2024-01-02.sql",
      createdAt: new Date("2024-01-02T12:00:00Z"),
      size: 2097152,
      type: "database" as const,
      format: "sql" as const,
    },
  ]),
  getBackupDownloadUrl: () => "https://example.com/download",
  deleteBackup: vi.fn(),
}));

// ---- Products mocks ----

vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({
    data: {
      products: [
        {
          id: "p1",
          name: "Coca Cola 355ml",
          description: null,
          price: 15.5,
          cost: 10,
          stock: 100,
          minStock: 10,
          categoryId: "cat1",
          categoryName: "Bebidas",
          barcode: null,
          sku: "COCA-355",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "p2",
          name: "Sabritas 45g",
          description: null,
          price: 12.0,
          cost: 8,
          stock: 5,
          minStock: 15,
          categoryId: "cat2",
          categoryName: "Botanas",
          barcode: null,
          sku: "SAB-045",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    },
    isLoading: false,
    error: null,
  }),
  useDeleteProduct: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// ---- Suppliers mocks ----

vi.mock("@/hooks/useSuppliers", () => ({
  useSuppliers: () => ({
    data: {
      suppliers: [
        {
          id: "s1",
          name: "Distribuidora del Norte",
          email: "contacto@dnorte.com",
          phone: "+528181234567",
          address: "Av. Principal 123",
          city: "Monterrey",
          state: "NL",
          postalCode: "64000",
          country: "MX",
          contactPerson: "Carlos López",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "s2",
          name: "Proveedora del Valle",
          email: "ventas@provalle.com",
          phone: "+523355678901",
          address: "Calle Secundaria 456",
          city: "Guadalajara",
          state: "JAL",
          postalCode: "44100",
          country: "MX",
          contactPerson: "Ana García",
          active: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    },
    isLoading: false,
    error: null,
  }),
  useDeleteSupplier: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// ---- Users mocks ----

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    data: { companyId: "company-1" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useUsers", () => ({
  useCompanyMembers: () => ({
    data: {
      users: [
        {
          id: "u1",
          name: "María García",
          email: "maria@tienda.com",
          role: "ADMIN",
          active: true,
          userCode: "ABC123",
        },
        {
          id: "u2",
          name: "Juan Pérez",
          email: "juan@tienda.com",
          role: "USER",
          active: true,
          userCode: "DEF456",
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useDeleteUser: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useResetMemberPassword: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAttachMemberEmail: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/lib/user-code", () => ({
  formatUserCodeForDisplay: (code: string) => ({ copyText: code }),
  memberHasUserCode: () => false,
}));

// ---- Categories mocks ----

vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({
    data: [
      { id: "cat1", name: "Bebidas", description: "Refrescos y aguas", active: true },
      { id: "cat2", name: "Botanas", description: "Sabritas y más", active: true },
    ],
    isLoading: false,
  }),
  useCreateCategory: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDeleteCategory: () => ({
    mutate: vi.fn(),
  }),
}));

// ---- LowStockAlert mocks ----

vi.mock("@/hooks/useInventory", () => ({
  useLowStockProducts: () => ({
    data: [
      {
        id: "ls1",
        name: "Sabritas 45g",
        sku: "SAB-045",
        stock: 5,
        minStock: 15,
        category: { name: "Botanas" },
        active: true,
      },
      {
        id: "ls2",
        name: "Galletas Chokis",
        sku: "GAL-100",
        stock: 3,
        minStock: 20,
        category: { name: "Dulces" },
        active: true,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

// ---- Subjects ----

import { ProductList } from "@/components/features/products/ProductList";
import { SupplierList } from "@/components/features/suppliers/SupplierList";
import { UserList } from "@/components/features/users/UserList";
import { CategoriesPage } from "@/components/features/categories/CategoriesPage";
import { LowStockAlert } from "@/components/features/inventory/LowStockAlert";
import { BackupList } from "@/components/features/backup/BackupList";
import { PageFrame } from "@/views/PageFrame";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withFrame(title: string, children: React.ReactNode) {
  return render(<PageFrame title={title}>{children}</PageFrame>);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

describe("Scoped list landmarks: Products", () => {
  afterEach(cleanup);

  it("renders heading via PageFrame", () => {
    render(<PageFrame title="Productos"><ProductList /></PageFrame>);
    const heading = screen.getByText("Productos");
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H1");
  });

  it("renders search input", () => {
    render(<PageFrame title="Productos"><ProductList /></PageFrame>);
    const searchInput = screen.getByPlaceholderText("Buscar productos...");
    expect(searchInput).not.toBeNull();
  });

  it("renders CTA button", () => {
    render(<PageFrame title="Productos"><ProductList /></PageFrame>);
    const cta = screen.getByText("Nuevo Producto");
    expect(cta).not.toBeNull();
  });

  it("renders table with product data", () => {
    render(<PageFrame title="Productos"><ProductList /></PageFrame>);
    // Product names — from mock data rendered in IdentityCell
    expect(screen.getByText("Coca Cola 355ml")).not.toBeNull();
    expect(screen.getByText("Sabritas 45g")).not.toBeNull();
    // SKU shown as IdentityCell subtitle
    expect(screen.getByText("COCA-355")).not.toBeNull();
  });

  it("renders SoftStatusPill for active product", () => {
    render(<PageFrame title="Productos"><ProductList /></PageFrame>);
    const pills = screen.getAllByText("Activo");
    expect(pills.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

describe("Scoped list landmarks: Suppliers", () => {
  afterEach(cleanup);

  it("renders heading via PageFrame", () => {
    render(<PageFrame title="Proveedores"><SupplierList /></PageFrame>);
    const heading = screen.getByText("Proveedores");
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H1");
  });

  it("renders search input", () => {
    render(<PageFrame title="Proveedores"><SupplierList /></PageFrame>);
    const searchInput = screen.getByPlaceholderText("Buscar proveedores...");
    expect(searchInput).not.toBeNull();
  });

  it("renders CTA button", () => {
    render(<PageFrame title="Proveedores"><SupplierList /></PageFrame>);
    const cta = screen.getByText("Nuevo Proveedor");
    expect(cta).not.toBeNull();
  });

  it("renders table with supplier names in IdentityCell", () => {
    render(<PageFrame title="Proveedores"><SupplierList /></PageFrame>);
    expect(screen.getByText("Distribuidora del Norte")).not.toBeNull();
    expect(screen.getByText("Proveedora del Valle")).not.toBeNull();
  });

  it("renders SoftStatusPill for active supplier", () => {
    render(<PageFrame title="Proveedores"><SupplierList /></PageFrame>);
    expect(screen.getByText("Activo")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

describe("Scoped list landmarks: Users", () => {
  afterEach(cleanup);

  it("renders heading via PageFrame", () => {
    render(<PageFrame title="Usuarios"><UserList /></PageFrame>);
    const heading = screen.getByText("Usuarios");
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H1");
  });

  it("renders search input", () => {
    render(<PageFrame title="Usuarios"><UserList /></PageFrame>);
    const searchInput = screen.getByPlaceholderText("Buscar usuarios...");
    expect(searchInput).not.toBeNull();
  });

  it("renders CTA button", () => {
    render(<PageFrame title="Usuarios"><UserList /></PageFrame>);
    const cta = screen.getByText("Nuevo Usuario");
    expect(cta).not.toBeNull();
  });

  it("renders table with user names in IdentityCell", () => {
    render(<PageFrame title="Usuarios"><UserList /></PageFrame>);
    expect(screen.getByText("María García")).not.toBeNull();
    expect(screen.getByText("Juan Pérez")).not.toBeNull();
  });

  it("renders emails as IdentityCell subtitle", () => {
    render(<PageFrame title="Usuarios"><UserList /></PageFrame>);
    expect(screen.getByText("maria@tienda.com")).not.toBeNull();
    expect(screen.getByText("juan@tienda.com")).not.toBeNull();
  });

  it("renders role badge for each user", () => {
    render(<PageFrame title="Usuarios"><UserList /></PageFrame>);
    expect(screen.getByText("Administrador")).not.toBeNull();
    expect(screen.getByText("Cajero")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

describe("Scoped list landmarks: Categories", () => {
  afterEach(cleanup);

  it("renders heading via PageFrame", () => {
    render(<PageFrame title="Categorias"><CategoriesPage /></PageFrame>);
    const heading = screen.getByText("Categorias");
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H1");
  });

  it("renders category names in IdentityCell", () => {
    render(<PageFrame title="Categorias"><CategoriesPage /></PageFrame>);
    expect(screen.getByText("Bebidas")).not.toBeNull();
    expect(screen.getByText("Botanas")).not.toBeNull();
  });

  it("renders category descriptions", () => {
    render(<PageFrame title="Categorias"><CategoriesPage /></PageFrame>);
    expect(screen.getByText("Refrescos y aguas")).not.toBeNull();
    expect(screen.getByText("Sabritas y más")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Low Stock Alert
// ---------------------------------------------------------------------------

describe("Scoped list landmarks: LowStockAlert", () => {
  afterEach(cleanup);

  it("renders heading", () => {
    render(<LowStockAlert />);
    const heading = screen.getByText((content) =>
      content.includes("Productos con Stock Bajo"),
    );
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H3");
  });

  it("renders total count in heading", () => {
    render(<LowStockAlert />);
    // Heading includes the count: "Productos con Stock Bajo (2)"
    expect(screen.getByText("Productos con Stock Bajo (2)")).not.toBeNull();
  });

  it("renders search input", () => {
    render(<LowStockAlert />);
    const searchInput = screen.getByPlaceholderText("Buscar productos...");
    expect(searchInput).not.toBeNull();
  });

  it("renders low-stock products with IdentityCell", () => {
    render(<LowStockAlert />);
    expect(screen.getByText("Sabritas 45g")).not.toBeNull();
    expect(screen.getByText("Galletas Chokis")).not.toBeNull();
    // SKUs shown as IdentityCell subtitle
    expect(screen.getByText("SAB-045")).not.toBeNull();
  });

  it("renders current stock values", () => {
    render(<LowStockAlert />);
    expect(screen.getByText("5")).not.toBeNull();
    expect(screen.getByText("3")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Backup List
// ---------------------------------------------------------------------------

describe("Scoped list landmarks: BackupList", () => {
  afterEach(cleanup);

  it("renders heading via PageFrame", () => {
    render(<PageFrame title="Respaldo"><BackupList /></PageFrame>);
    const heading = screen.getByText("Respaldo");
    expect(heading).not.toBeNull();
    expect(heading.tagName).toBe("H1");
  });

  it("renders backup filenames in IdentityCell", () => {
    render(<PageFrame title="Respaldo"><BackupList /></PageFrame>);
    expect(screen.getByText("backup-2024-01-01.sql")).not.toBeNull();
    expect(screen.getByText("backup-2024-01-02.sql")).not.toBeNull();
  });

  it("renders formatted sizes", () => {
    render(<PageFrame title="Respaldo"><BackupList /></PageFrame>);
    // 1048576 bytes = 1 MB
    expect(screen.getByText("1 MB")).not.toBeNull();
    // 2097152 bytes = 2 MB
    expect(screen.getByText("2 MB")).not.toBeNull();
  });
});
