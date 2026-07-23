import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();
const usePathnameMock = vi.fn(() => "/app/onboarding/local");
const mockUseUser = vi.fn();
const mockCreateStore = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => usePathnameMock(),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => mockUseUser(),
}));

vi.mock("@/lib/services/storeService", () => ({
  createStore: (data: Record<string, unknown>) => mockCreateStore(data),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const OWNER_USER = {
  id: "u1",
  email: "owner@acme.com",
  role: "ADMIN",
  isActive: true,
  name: "Owner",
  companyId: "c1",
  membershipRole: "OWNER",
  companyProfileComplete: false,
  registrationWizardStep: "LOCAL" as const,
};

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
  mockUseUser.mockClear();
  mockCreateStore.mockClear();
  mockInvalidateQueries.mockClear();
});

describe("LocalOnboardingPage", () => {
  async function loadPage() {
    const mod = await import("@/views/LocalOnboardingPage");
    return mod.LocalOnboardingPage;
  }

  beforeEach(() => {
    mockCreateStore.mockResolvedValue({ id: "s1", name: "Sucursal Centro", code: "CENTRO" });
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
  });

  it("renders name and code fields without caja or float inputs", async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByLabelText(/nombre/i)).not.toBeNull();
    expect(screen.getByLabelText(/código|codigo/i)).not.toBeNull();
    expect(screen.queryByLabelText(/caja/i)).toBeNull();
    expect(screen.queryByLabelText(/fondo|float|apertura/i)).toBeNull();
  });

  it("POSTs store via createStore and redirects to dashboard", async () => {
    const Page = await loadPage();
    render(<Page />);

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "Sucursal Centro" },
    });
    fireEvent.change(screen.getByLabelText(/código|codigo/i), {
      target: { value: "centro" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear|continuar|guardar/i }));

    await waitFor(() => {
      expect(mockCreateStore).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Sucursal Centro",
          code: "centro",
        }),
      );
    });
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["user"] });
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });
    const arg = replaceMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("/app/dashboard");
  });

  it("rejects empty name", async () => {
    const Page = await loadPage();
    render(<Page />);
    fireEvent.change(screen.getByLabelText(/código|codigo/i), {
      target: { value: "LOC1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear|continuar|guardar/i }));
    await waitFor(() => {
      expect(screen.getByText(/obligatorio/i)).not.toBeNull();
    });
    expect(mockCreateStore).not.toHaveBeenCalled();
  });
});
