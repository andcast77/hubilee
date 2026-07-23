import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

// --- Mocks (top-level, hoist-safe) ---
const replaceMock = vi.fn();
const usePathnameMock = vi.fn(() => "/app/dashboard");
const mockUseUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => usePathnameMock(),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => mockUseUser(),
}));

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
  usePathnameMock.mockClear();
  mockUseUser.mockClear();
});

// Use the gate after mocks are set up — import inside test hoist won't work
// for dynamic user, so we import statically via the import(...) pattern.
describe("CompanyProfileGate", () => {
  async function loadGate() {
    const mod = await import("@/components/auth/CompanyProfileGate");
    return mod.CompanyProfileGate;
  }

  // ==============================================================
  // RED: these tests fail because CompanyProfileGate doesn't exist.
  // ==============================================================

  // 3.1.a: OWNER + incomplete → redirect to /app/onboarding/company
  it("redirects OWNER with incomplete company to /app/onboarding/company", async () => {
    mockUseUser.mockReturnValue({
      data: {
        id: "u1",
        email: "owner@acme.com",
        role: "ADMIN",
        isActive: true,
        name: "Owner",
        companyId: "c1",
        membershipRole: "OWNER",
        companyProfileComplete: false,
      },
      isLoading: false,
    });

    const Gate = await loadGate();
    render(
      <Gate>
        <div>Protected content</div>
      </Gate>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const arg = replaceMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("/app/onboarding/company");
    expect(screen.queryByText("Protected content")).toBeNull();
  });

  // 3.1.b: OWNER + complete → render children
  it("renders children for OWNER with complete company", async () => {
    mockUseUser.mockReturnValue({
      data: {
        id: "u1",
        email: "owner@acme.com",
        role: "ADMIN",
        isActive: true,
        name: "Owner",
        companyId: "c1",
        membershipRole: "OWNER",
        companyProfileComplete: true,
      },
      isLoading: false,
    });

    const Gate = await loadGate();
    render(
      <Gate>
        <div>Protected content</div>
      </Gate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Protected content")).not.toBeNull();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // 3.1.c: ADMIN + incomplete → render children
  it("renders children for ADMIN with incomplete company", async () => {
    mockUseUser.mockReturnValue({
      data: {
        id: "u2",
        email: "admin@acme.com",
        role: "ADMIN",
        isActive: true,
        name: "Admin",
        companyId: "c1",
        membershipRole: "ADMIN",
        companyProfileComplete: false,
      },
      isLoading: false,
    });

    const Gate = await loadGate();
    render(
      <Gate>
        <div>Admin content</div>
      </Gate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin content")).not.toBeNull();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // 3.1.d: USER (floor) + incomplete → render children
  it("renders children for USER with incomplete company", async () => {
    mockUseUser.mockReturnValue({
      data: {
        id: "u3",
        email: null,
        role: "USER",
        isActive: true,
        name: "Floor",
        companyId: "c1",
        membershipRole: "USER",
        companyProfileComplete: false,
      },
      isLoading: false,
    });

    const Gate = await loadGate();
    render(
      <Gate>
        <div>Floor content</div>
      </Gate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Floor content")).not.toBeNull();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // 3.1.e: OWNER incomplete + already on onboarding path → no redirect
  it("does not redirect when already on /app/onboarding/company path", async () => {
    usePathnameMock.mockReturnValue("/app/onboarding/company");

    mockUseUser.mockReturnValue({
      data: {
        id: "u1",
        email: "owner@acme.com",
        role: "ADMIN",
        isActive: true,
        name: "Owner",
        companyId: "c1",
        membershipRole: "OWNER",
        companyProfileComplete: false,
      },
      isLoading: false,
    });

    const Gate = await loadGate();
    render(
      <Gate>
        <div>Onboarding page</div>
      </Gate>,
    );

    await waitFor(() => {
      expect(screen.getByText("Onboarding page")).not.toBeNull();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // 3.1.f: Loading state shows spinner
  it("shows loading spinner when user data is loading", async () => {
    mockUseUser.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const Gate = await loadGate();
    render(
      <Gate>
        <div>Protected content</div>
      </Gate>,
    );

    expect(screen.queryByText("Protected content")).toBeNull();
    expect(screen.getByText("Cargando...")).not.toBeNull();
  });
});
