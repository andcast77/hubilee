import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterPage } from "@/views/RegisterPage";

// --- MOCKS ---

// Mock next/navigation (used by @/lib/next-nav internally for Link, useNavigate, etc.)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/register",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link (used by @/lib/next-nav's Link component)
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: Record<string, unknown>) => (
    <a href={href as string} {...rest}>
      {children as React.ReactNode}
    </a>
  ),
}));

vi.mock("@/lib/auth/useRedirectIfAuthenticated", () => ({
  useRedirectIfAuthenticated: () => ({ ready: true }),
  AuthSessionBootScreen: () => null,
}));

// Mock authApi post — returns an empty success response
const authApiPostMock = vi.fn(async (_endpoint: string, _data?: unknown) => ({}));
vi.mock("@/lib/api/client", () => ({
  authApi: {
    post: (endpoint: string, data?: unknown) => authApiPostMock(endpoint, data),
  },
}));

// Mock RegistrationTurnstile — immediately supplies a captcha token on mount
// so the submit flow can proceed without an actual Turnstile widget.
vi.mock("@/components/auth/RegistrationTurnstile", () => ({
  RegistrationTurnstile: ({ onToken }: { onToken: (t: string | null) => void }) => {
    if (typeof onToken === "function") {
      onToken("mock-captcha-token");
    }
    return null;
  },
}));

afterEach(() => {
  cleanup();
  authApiPostMock.mockReset();
});

// ==========================================================
// Phase 1 — RED: these tests fail on the current dark
// AuthBrand RegisterPage, and prove the light-shell rewrite
// + preserved submit behavior when they pass.
// ==========================================================

describe("RegisterPage light shell", () => {
  // 1.2 — RED: light shell markers present, AuthBrand absent
  it("renders Hubilee Pos BrandMark and no AuthBrand chrome", () => {
    render(<RegisterPage />);

    // Current (dark AuthBrand) page renders AuthBrandCard with
    // cardTitle="Registrarse". After the light-shell rewrite
    // this AuthBrand-specific text MUST be gone. → RED on
    // current code because AuthBrandCard IS rendered.
    expect(screen.queryByText("Registrarse")).toBeNull();

    // After the rewrite the page MUST show the "Hubilee Pos"
    // BrandMark (matching LoginPage's light shell). → RED on
    // current code (which shows dark AuthBrand content instead).
    // There are two BrandMark instances (visual panel + mobile)
    // so we assert at least one is present.
    const brandLinks = screen.getAllByRole("link", { name: /hubilee pos/i });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
  });

  // 1.3 — RED: valid submit calls API with posEnabled:true and
  // advances to link-pending (magic-link behaviour preserved).
  it("calls authApi.post /register/link/send with posEnabled:true on valid submit and shows link-pending", async () => {
    render(<RegisterPage />);

    // Fill email text input
    const textInputs = screen.getAllByRole("textbox");
    expect(textInputs.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(textInputs[0], { target: { value: "juan@test.com" } });

    // Fill password field
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(passwordInputs[0], { target: { value: "SecurePass1" } });

    // Submit the form
    const submitBtn = screen.getByRole("button", { name: /registrar empresa/i });
    fireEvent.click(submitBtn);

    // Assert the API was called with the correct endpoint and body
    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/register/link/send",
        expect.objectContaining({
          email: "juan@test.com",
          posEnabled: true,
          hrEnabled: false,
        }),
      );
    });

    // POS register must not collect / send companyName (wizard owns that).
    const [, body] = authApiPostMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(body).not.toHaveProperty("companyName");
    expect(screen.queryByLabelText(/nombre de la empresa/i)).toBeNull();

    // Assert the UI advances to the link-pending step (shows "Revisa tu correo")
    expect(screen.queryByText(/Revisa tu correo/i)).not.toBeNull();
  });

  // 3.1 — Optional: terms opens a dialog when clicked
  it("opens terms dialog when clicking terms link", () => {
    render(<RegisterPage />);

    // The terms label includes a button to open the dialog
    const termsBtn = screen.getByText("términos y condiciones");
    expect(termsBtn).not.toBeNull();
    expect(termsBtn.tagName).toBe("BUTTON");

    // Click should open the dialog
    fireEvent.click(termsBtn);
    expect(screen.getByText("Términos y Condiciones")).not.toBeNull();
  });

  // 3.1 — Optional: resend from link-pending calls the same endpoint
  // without requiring a new captcha token.
  it("resend from link-pending calls /register/link/send without captcha", async () => {
    // First submit to reach link-pending
    render(<RegisterPage />);

    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "juan@test.com" } });

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "SecurePass1" } });

    const submitBtn = screen.getByRole("button", { name: /registrar empresa/i });
    fireEvent.click(submitBtn);

    // Wait for link-pending to appear
    await waitFor(() => {
      expect(screen.queryByText(/Revisa tu correo/i)).not.toBeNull();
    });

    // Clear the mock call count from initial submit
    authApiPostMock.mockClear();

    // Click "Reenviar enlace"
    const resendBtn = screen.getByRole("button", { name: /reenviar/i });
    fireEvent.click(resendBtn);

    // Assert resend calls the same endpoint with posEnabled:true
    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/register/link/send",
        expect.objectContaining({
          posEnabled: true,
          hrEnabled: false,
        }),
      );
    });
  });
});
