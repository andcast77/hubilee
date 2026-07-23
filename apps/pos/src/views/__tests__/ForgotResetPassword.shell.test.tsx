import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ForgotPasswordPage } from "@/views/ForgotPasswordPage";
import { ResetPasswordPage } from "@/views/ResetPasswordPage";
import { LoginPage } from "@/views/LoginPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/login",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams("email=juan%40test.com"),
}));

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

vi.mock("@/lib/landingUrls", () => ({
  getLandingUrls: () => ({ hub: "https://hub.example", pos: "https://pos.example" }),
}));

const authApiPostMock = vi.fn(async (endpoint: string, _data?: unknown) => {
  if (endpoint === "/password-reset/otp/verify") {
    return { success: true, data: { resetTicket: "mock-reset-ticket" } };
  }
  if (endpoint === "/password-reset") {
    return { success: true, data: { ok: true } };
  }
  return { success: true, data: { sent: true } };
});

vi.mock("@/lib/api/client", () => ({
  authApi: {
    post: (endpoint: string, data?: unknown) => authApiPostMock(endpoint, data),
  },
}));

vi.mock("@/components/auth/RegistrationTurnstile", () => ({
  RegistrationTurnstile: ({ onToken }: { onToken: (t: string | null) => void }) => {
    onToken("mock-captcha");
    return null;
  },
}));

beforeEach(() => {
  authApiPostMock.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("Pos password-reset OTP UI", () => {
  it("ForgotPasswordPage sends password-reset OTP and never hits Hub forgot URL", async () => {
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText(/tu@empresa/i), {
      target: { value: "juan@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/password-reset/otp/send",
        expect.objectContaining({ email: "juan@test.com" }),
      );
    });
    expect(authApiPostMock.mock.calls.every(([ep]) => !String(ep).includes("hub"))).toBe(true);
    expect(screen.getByRole("heading", { name: /código enviado/i })).toBeTruthy();
  });

  it("ResetPasswordPage verifies OTP then sets new password via reset API only", async () => {
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/dígito 1 de 6/i), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), {
      target: { value: "NewSecure1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /restablecer|guardar/i }));

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/password-reset/otp/verify",
        expect.objectContaining({ email: "juan@test.com", code: "123456" }),
      );
    });
    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/password-reset",
        expect.objectContaining({
          email: "juan@test.com",
          resetTicket: "mock-reset-ticket",
          newPassword: "NewSecure1",
        }),
      );
    });
  });

  it("LoginPage ¿Olvidaste? links to local /forgot-password", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /olvidaste tu contraseña/i });
    const href = link.getAttribute("href") ?? "";
    expect(href === "/forgot-password" || href.endsWith("/forgot-password")).toBe(true);
    expect(href).not.toContain("hub.example");
  });
});
