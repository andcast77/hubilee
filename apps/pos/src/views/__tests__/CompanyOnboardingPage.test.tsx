import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

// Mock sonner toast
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
    expect((screen.getByLabelText(/nombre/i) as HTMLInputElement).value).toBe(
      "Acme Prefill",
    );
    expect((screen.getByLabelText(/logo/i) as HTMLInputElement).value).toBe(
      "https://cdn.example/logo.png",
    );
  });

  it("renders optional logo URL field", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    const Page = await loadPage();
    render(<Page />);
    expect(screen.getByLabelText(/logo/i)).not.toBeNull();
  });

  // 4.1.a: Valid name + taxId → calls PUT /v1/companies/:id
  it("submits valid name and taxId via PUT /v1/companies/:id", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    // Fill in company name
    const nameInput = screen.getByLabelText(/nombre/i);
    fireEvent.change(nameInput, { target: { value: "   Acme Corp   " } });

    // Fill in taxId
    const taxIdInput = screen.getByLabelText(/rfc|cuit|tax/i);
    fireEvent.change(taxIdInput, { target: { value: "ABC-123" } });

    // Submit
    const submitBtn = screen.getByRole("button", { name: /guardar|continuar/i });
    fireEvent.click(submitBtn);

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

  // 4.1.b: Sentinel "mi empresa" → rejected (doesn't call PUT)
  it("rejects sentinel 'mi empresa' as company name", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    const nameInput = screen.getByLabelText(/nombre/i);
    fireEvent.change(nameInput, { target: { value: "mi empresa" } });

    const taxIdInput = screen.getByLabelText(/rfc|cuit|tax/i);
    fireEvent.change(taxIdInput, { target: { value: "ABC-123" } });

    const submitBtn = screen.getByRole("button", { name: /guardar|continuar/i });
    fireEvent.click(submitBtn);

    // Should show an error message and NOT call the API
    await waitFor(() => {
      expect(screen.queryByText(/empresa válido/i)).not.toBeNull();
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  // 4.1.c: Empty name after trim → rejected
  it("rejects empty name after trimming", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    const nameInput = screen.getByLabelText(/nombre/i);
    fireEvent.change(nameInput, { target: { value: "   " } });

    const taxIdInput = screen.getByLabelText(/rfc|cuit|tax/i);
    fireEvent.change(taxIdInput, { target: { value: "ABC-123" } });

    const submitBtn = screen.getByRole("button", { name: /guardar|continuar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Should show an error message (name is required)
      expect(screen.queryByText(/obligatorio/i)).not.toBeNull();
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  // 4.1.d: Empty taxId → rejected
  it("rejects empty taxId", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    const nameInput = screen.getByLabelText(/nombre/i);
    fireEvent.change(nameInput, { target: { value: "Acme Corp" } });

    const taxIdInput = screen.getByLabelText(/rfc|cuit|tax/i);
    fireEvent.change(taxIdInput, { target: { value: "" } });

    const submitBtn = screen.getByRole("button", { name: /guardar|continuar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/obligatorio/i)).not.toBeNull();
    });
    expect(mockApiPut).not.toHaveBeenCalled();
  });

  // 4.1.e: After valid submit, invalidate user and redirect to /app/dashboard
  it("after valid submit, invalidates user query and redirects to /app/dashboard", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    mockApiPut.mockResolvedValue({ success: true });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    const nameInput = screen.getByLabelText(/nombre/i);
    fireEvent.change(nameInput, { target: { value: "Acme Corp" } });

    const taxIdInput = screen.getByLabelText(/rfc|cuit|tax/i);
    fireEvent.change(taxIdInput, { target: { value: "ABC-123" } });

    const submitBtn = screen.getByRole("button", { name: /guardar|continuar/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalled();
    });

    // Should invalidate the user query cache
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["user"] });
    });

    // Should navigate to /app/dashboard after success
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });
    const arg = replaceMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("/app/dashboard");
  });

  it("includes optional logo in PUT body when provided", async () => {
    mockUseUser.mockReturnValue({ data: OWNER_USER, isLoading: false });
    mockApiPut.mockResolvedValue({ success: true });

    const Page = await loadPage();
    render(<Page />);
    await waitFor(() => expect(mockApiGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/nombre/i), {
      target: { value: "Acme Corp" },
    });
    fireEvent.change(screen.getByLabelText(/rfc|cuit|tax/i), {
      target: { value: "ABC-123" },
    });
    fireEvent.change(screen.getByLabelText(/logo/i), {
      target: { value: "https://cdn.example/a.png" },
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
