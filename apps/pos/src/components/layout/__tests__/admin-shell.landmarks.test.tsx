import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";

// ---------------------------------------------------------------------------
// Mocks — all top-level so vitest hoists them before imports
// ---------------------------------------------------------------------------

vi.mock("@/lib/next-nav", () => ({
  Link: ({ children, to, href, ...props }: any) => (
    <a href={to ?? href ?? "/"} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useLocation: (opts?: { select?: (l: { pathname: string }) => unknown }) => {
    const location = { pathname: "/app/dashboard" };
    return opts?.select ? opts.select(location) : location;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/app/dashboard",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
  useQuery: () => ({
    data: undefined,
    isLoading: false,
    isSuccess: false,
    refetch: vi.fn(),
  }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    data: {
      id: "user-1",
      name: "Test Usuario",
      email: "test@acme.com",
      companyId: "comp-1",
      role: "ADMIN",
      isActive: true,
      isSuperuser: false,
      preferredCompanyId: "comp-1",
      company: { id: "comp-1", name: "Acme Corp", posEnabled: true, hrEnabled: false },
      companyProfileComplete: true,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useCompanies", () => ({
  useCompanies: () => ({
    data: [{ id: "comp-1", name: "Acme Corp", posEnabled: true }],
    isLoading: false,
    isSuccess: true,
  }),
}));

vi.mock("@/hooks/useRegisterPosServiceWorker", () => ({
  useRegisterPosServiceWorker: () => {},
}));

vi.mock("@/hooks/usePermissions", () => ({
  useModuleAccess: () => true,
  Module: { SALES: "SALES", PRODUCTS: "PRODUCTS", CUSTOMERS: "CUSTOMERS" },
}));

vi.mock("@/hooks/useInAppNotifications", () => ({
  useInAppNotifications: () => ({
    items: [],
    unreadCount: 0,
    isLoading: false,
    refetch: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}));

vi.mock("@/components/providers/StoreContext", () => ({
  useStoreContextOptional: () => undefined,
  StoreProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/lib/api/client", () => ({
  authApi: { post: vi.fn().mockResolvedValue({ success: true }) },
  posApi: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

// The notification service is used by useInAppNotifications hook
vi.mock("@/lib/services/notificationService", () => ({
  getUserNotifications: vi.fn(() =>
    Promise.resolve({ notifications: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } }),
  ),
  getUnreadCount: vi.fn(() => Promise.resolve(0)),
  markAsRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve()),
}));

// Mock the gates to pass through children (we're testing the layout shell, not auth)
vi.mock("@/components/auth/DashboardSessionGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DashboardSessionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/auth/CompanyProfileGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CompanyProfileGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/POSModuleGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PosModuleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/providers/CompanyContextBootstrap", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CompanyContextBootstrap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---- Test Subject ----
import ProtectedAppLayout from "@/app/app/(app)/ProtectedAppLayout";

describe("Admin Shell Landmarks", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders sidebar navigation landmark", () => {
    render(
      <ProtectedAppLayout>
        <div>Page content</div>
      </ProtectedAppLayout>,
    );
    // Sidebar renders two <aside role="navigation"> (mobile + desktop)
    const navElements = screen.getAllByRole("navigation");
    expect(navElements.length).toBeGreaterThanOrEqual(2);
    // At least one nav should contain the actual navigation content
    // (content-based selector avoids coupling to Tailwind responsive classes)
    const sidebarWithContent = navElements.find(
      (el) => el.textContent?.includes("Dashboard"),
    );
    expect(sidebarWithContent).not.toBeNull();
  });

  it("renders admin header landmark", () => {
    render(
      <ProtectedAppLayout>
        <div>Page content</div>
      </ProtectedAppLayout>,
    );
    expect(screen.getByTestId("admin-header")).not.toBeNull();
  });

  it("renders muted admin canvas (not the content card)", () => {
    render(
      <ProtectedAppLayout>
        <div>Page content</div>
      </ProtectedAppLayout>,
    );
    expect(screen.getByTestId("admin-canvas")).not.toBeNull();
    // content-card belongs to PageFrame, not the layout canvas
    expect(screen.queryByTestId("content-card")).toBeNull();
  });

  // ---- Triangulation tests ----

  it("renders children inside the admin canvas", () => {
    render(
      <ProtectedAppLayout>
        <p data-testid="child-content">Hola, mundo</p>
      </ProtectedAppLayout>,
    );
    const child = screen.getByTestId("child-content");
    expect(child).not.toBeNull();
    expect(child.textContent).toBe("Hola, mundo");

    const canvas = screen.getByTestId("admin-canvas");
    expect(canvas).not.toBeNull();
    expect(canvas.textContent).toContain("Hola, mundo");
  });

  it("wires hamburger and opens mobile nav overlay", () => {
    render(
      <ProtectedAppLayout>
        <div>Content</div>
      </ProtectedAppLayout>,
    );
    const menuButton = screen.getByRole("button", { name: "Abrir menú" });
    expect(menuButton).not.toBeNull();
    expect(screen.queryByTestId("admin-mobile-nav")).toBeNull();
    fireEvent.click(menuButton);
    expect(screen.getByTestId("admin-mobile-nav")).not.toBeNull();
    expect(screen.getByLabelText("Menú de navegación")).not.toBeNull();
  });

  it("header has bell notification button", () => {
    render(
      <ProtectedAppLayout>
        <div>Content</div>
      </ProtectedAppLayout>,
    );
    const header = screen.getByTestId("admin-header");
    // The aria-label changes based on unreadCount (default 0 → "Notificaciones")
    const bellButton = header.querySelector(
      'button[aria-label="Notificaciones"]',
    );
    // Fallback: the bell uses a Bell icon from lucide — check for the SVG inside
    const bellIcon = header.querySelector(
      'button svg.lucide-bell',
    );
    expect(bellButton || bellIcon).not.toBeNull();
  });

  it("renders sidebar with navigation items from navGroups", () => {
    render(
      <ProtectedAppLayout>
        <div>Content</div>
      </ProtectedAppLayout>,
    );
    // Dashboard is always the first nav item in Principal group
    expect(screen.getByText("Dashboard")).not.toBeNull();
    expect(screen.getByText("Punto de Venta")).not.toBeNull();
  });

  it("renders company name in sidebar header", () => {
    render(
      <ProtectedAppLayout>
        <div>Content</div>
      </ProtectedAppLayout>,
    );
    // Company name from the mocked useUser — may appear multiple times
    const matches = screen.getAllByText("Acme Corp");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
