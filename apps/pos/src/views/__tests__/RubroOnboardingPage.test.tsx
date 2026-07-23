import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();
const usePathnameMock = vi.fn(() => "/app/onboarding/rubro");
const mockUseUser = vi.fn();
const mockApiPut = vi.fn();
const mockApiGet = vi.fn();
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

vi.mock("@/lib/api/client", () => ({
  companiesApi: {
    get: (companyId: string) => mockApiGet(companyId),
    update: (companyId: string, data: Record<string, unknown>) =>
      mockApiPut(companyId, data),
  },
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
  registrationWizardStep: "RUBRO" as const,
};

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
  mockUseUser.mockClear();
  mockApiPut.mockClear();
  mockApiGet.mockClear();
  mockInvalidateQueries.mockClear();
});

describe("RubroOnboardingPage", () => {
  async function loadPage() {
    vi.resetModules();
    const mod = await import("@/views/RubroOnboardingPage");
    return mod.RubroOnboardingPage;
  }

  beforeEach(() => {
    mockApiPut.mockResolvedValue({ success: true });
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
  });

  it("renders Spanish rubro options including Electrónica", async () => {
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByText(/electrónica/i)).not.toBeNull();
    expect(screen.getByText(/verdulería/i)).not.toBeNull();
    expect(screen.getByRole("button", { name: /continuar|guardar/i })).not.toBeNull();
  });

  it("prefills the saved businessType when returning to Rubro", async () => {
    mockApiGet.mockResolvedValue({
      success: true,
      data: { businessType: "KIOSCO" },
    });
    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("c1");
    });
    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /kiosco/i }).getAttribute("aria-checked"),
      ).toBe("true");
    });
  });

  it("PUTs businessType ELECTRONICA and advances to Local", async () => {
    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("c1");
    });

    fireEvent.click(screen.getByRole("radio", { name: /electrónica/i }));
    fireEvent.click(screen.getByRole("button", { name: /continuar|guardar/i }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({ businessType: "ELECTRONICA" }),
      );
    });
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["user"] });
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });
    const arg = replaceMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("/app/onboarding/local");
  });

  it("does not submit without a selected rubro", async () => {
    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /continuar|guardar/i }));
    await waitFor(() => {
      expect(screen.getByText(/seleccion/i)).not.toBeNull();
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });
});
