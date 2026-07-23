import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

// --- Mocks (top-level, hoist-safe) ---
const replaceMock = vi.fn();
const pushMock = vi.fn();
const usePathnameMock = vi.fn(() => "/app/onboarding/company");
const mockUseUser = vi.fn();
const mockApiPut = vi.fn();
const mockApiGet = vi.fn();
const mockInvalidateQueries = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
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
  authApi: {
    me: vi.fn(),
  },
  companiesApi: {
    get: (companyId: string) => mockApiGet(companyId),
    update: (companyId: string, data: Record<string, unknown>) =>
      mockApiPut(companyId, data),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
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
  company: { id: "c1", name: "Mi Empresa", modules: { hr: false, pos: true, tech: false } },
};

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
  pushMock.mockClear();
  mockUseUser.mockClear();
  mockApiPut.mockClear();
  mockApiGet.mockClear();
  mockInvalidateQueries.mockClear();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
});

describe("CompanyOnboardingPage wizard submit", () => {
  async function loadPage() {
    const mod = await import("@/views/CompanyOnboardingPage");
    return mod.CompanyOnboardingPage;
  }

  beforeEach(() => {
    mockApiGet.mockResolvedValue({ success: true, data: {} });
    mockApiPut.mockResolvedValue({ success: true });
  });

  it("uses WizardShell empresa step chrome", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByLabelText("Progreso del registro")).not.toBeNull();
    expect(screen.getByText("Empresa")).not.toBeNull();
  });

  it("prefills taxId (and optionals) from GET /v1/companies/:id", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        name: "Acme Prefill",
        taxId: "TAX-999",
        address: "Calle 1",
        phone: "555",
        logo: "https://cdn.example/logo.png",
      },
    });

    const Page = await loadPage();
    render(<Page />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("c1");
    });
    await waitFor(() => {
      expect((screen.getByLabelText(/rfc|cuit|tax/i) as HTMLInputElement).value).toBe(
        "TAX-999",
      );
    });
    expect((screen.getByLabelText(/^nombre/i) as HTMLInputElement).value).toBe(
      "Acme Prefill",
    );
    expect(screen.getByAltText("Logo preview").getAttribute("src")).toBe(
      "https://cdn.example/logo.png",
    );
  });

  it("renders optional logo file field", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    const Page = await loadPage();
    render(<Page />);
    const logoInput = screen.getByLabelText(/^logo$/i) as HTMLInputElement;
    expect(logoInput).not.toBeNull();
    expect(logoInput.type).toBe("file");
  });

  it("submits valid name and taxId via PUT /v1/companies/:id", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^nombre/i), {
      target: { value: "   Acme Corp   " },
    });
    fireEvent.change(screen.getByLabelText(/rfc|cuit|tax/i), {
      target: { value: "ABC-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar|continuar/i }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({
          name: "Acme Corp",
          taxId: "ABC-123",
        }),
      );
    });
  });

  it("rejects sentinel 'mi empresa' as company name", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^nombre/i), {
      target: { value: "mi empresa" },
    });
    fireEvent.change(screen.getByLabelText(/rfc|cuit|tax/i), {
      target: { value: "ABC-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar|continuar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/empresa válido/i),
        expect.any(Object),
      );
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it("rejects empty name after trimming", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^nombre/i), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText(/rfc|cuit|tax/i), {
      target: { value: "ABC-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar|continuar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/obligatorio/i),
        expect.any(Object),
      );
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it("rejects empty taxId", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^nombre/i), {
      target: { value: "Acme Corp" },
    });
    fireEvent.change(screen.getByLabelText(/rfc|cuit|tax/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar|continuar/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/obligatorio/i),
        expect.any(Object),
      );
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  it("after valid submit, invalidates user query and redirects to Rubro step", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    mockApiPut.mockResolvedValue({ success: true });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/^nombre/i), {
      target: { value: "Acme Corp" },
    });
    fireEvent.change(screen.getByLabelText(/rfc|cuit|tax/i), {
      target: { value: "ABC-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar|continuar/i }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["user"] });
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });
    const arg = replaceMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("/app/onboarding/rubro");
  });

  it("includes prefilled logo in PUT body when provided", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    mockApiGet.mockResolvedValue({
      success: true,
      data: {
        name: "Acme Prefill",
        taxId: "TAX-1",
        logo: "https://cdn.example/a.png",
      },
    });
    mockApiPut.mockResolvedValue({ success: true });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByAltText("Logo preview").getAttribute("src")).toBe(
        "https://cdn.example/a.png",
      );
    });

    fireEvent.change(screen.getByLabelText(/^nombre/i), {
      target: { value: "Acme Corp" },
    });
    fireEvent.change(screen.getByLabelText(/rfc|cuit|tax/i), {
      target: { value: "ABC-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar|continuar/i }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({
          name: "Acme Corp",
          taxId: "ABC-123",
          logo: "https://cdn.example/a.png",
        }),
      );
    });
  });
});
