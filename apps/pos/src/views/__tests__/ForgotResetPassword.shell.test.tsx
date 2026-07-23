import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ForgotPasswordPage } from "@/views/ForgotPasswordPage";
import { ResetPasswordPage } from "@/views/ResetPasswordPage";
import { LoginPage } from "@/views/LoginPage";
import {
  clearPasswordResetTicket,
  storePasswordResetTicket,
} from "@/lib/password-reset-ticket";

const navigateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigateMock, replace: navigateMock }),
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
  if (endpoint === "/login") {
    return {
      success: true,
      data: {
        user: {
          id: "u1",
          email: "juan@test.com",
          name: "Juan",
          role: "USER",
          isSuperuser: false,
        },
        companyId: "c1",
        membershipRole: "OWNER",
        companyProfileComplete: true,
      },
    };
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

function expectLightSplitShell() {
  const brandLinks = screen.getAllByRole("link", { name: /hubilee pos/i });
  expect(brandLinks.length).toBeGreaterThanOrEqual(1);

  const split = document.querySelector(".lg\\:grid-cols-2");
  expect(split).not.toBeNull();

  const loneCard = document.querySelector(".max-w-md");
  const hasMaxW6xl = document.querySelector(".max-w-6xl") !== null;
  expect(hasMaxW6xl).toBe(true);
  if (loneCard && !hasMaxW6xl) {
    throw new Error("expected split shell, found sole max-w-md chrome");
  }
}

beforeEach(() => {
  authApiPostMock.mockClear();
  navigateMock.mockClear();
  clearPasswordResetTicket();
});

afterEach(() => {
  cleanup();
  clearPasswordResetTicket();
});

describe("Pos password-reset OTP UI", () => {
  it("ForgotPasswordPage renders login-matched light split shell with BrandMark", () => {
    render(<ForgotPasswordPage />);
    expectLightSplitShell();
    expect(screen.getByRole("heading", { name: /olvidaste tu contraseña/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /enviar código/i })).toBeTruthy();
  });

  it("ResetPasswordPage renders login-matched light split shell with BrandMark", () => {
    storePasswordResetTicket("juan@test.com", "mock-reset-ticket");
    render(<ResetPasswordPage />);
    expectLightSplitShell();
    expect(screen.getByRole("heading", { name: /nueva contraseña/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^restablecer$/i })).toBeTruthy();
  });

  it("ForgotPasswordPage asks OTP then Verificar (no password on this step)", async () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole("button", { name: /enviar código/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /volver al login/i })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/tu@empresa/i), {
      target: { value: "juan@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /ingresá el código/i })).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: /^verificar$/i })).toBeTruthy();
    expect(screen.queryByLabelText(/nueva contraseña/i)).toBeNull();
    expect(screen.getByRole("button", { name: /usar otro email/i })).toBeTruthy();
  });

  it("ResetPasswordPage resets then auto-logs in", async () => {
    storePasswordResetTicket("juan@test.com", "mock-reset-ticket");
    render(<ResetPasswordPage />);

    expect(screen.getByRole("button", { name: /^restablecer$/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), {
      target: { value: "NewSecure1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^restablecer$/i }));

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
    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/login",
        expect.objectContaining({
          email: "juan@test.com",
          password: "NewSecure1",
        }),
      );
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });
  });

  it("ForgotPasswordPage verify navigates to reset with ticket", async () => {
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
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /ingresá el código/i })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText(/dígito 1 de 6/i), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^verificar$/i }));

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/password-reset/otp/verify",
        expect.objectContaining({ email: "juan@test.com", code: "123456" }),
      );
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });
    const endpoints = authApiPostMock.mock.calls.map(([ep]) => String(ep));
    expect(endpoints).toEqual(["/password-reset/otp/send", "/password-reset/otp/verify"]);
    expect(endpoints.every((ep) => !ep.includes("hub") && !ep.includes("forgot-password"))).toBe(
      true,
    );
  });

  it("ResetPasswordPage sets new password via reset API only", async () => {
    storePasswordResetTicket("juan@test.com", "mock-reset-ticket");
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), {
      target: { value: "NewSecure1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^restablecer$/i }));

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
    const endpoints = authApiPostMock.mock.calls.map(([ep]) => String(ep));
    expect(endpoints.every((ep) => !ep.includes("hub") && !ep.includes("forgot-password"))).toBe(
      true,
    );
  });

  it("LoginPage ¿Olvidaste? links to local /forgot-password", () => {
    render(<LoginPage />);
    const link = screen.getByRole("link", { name: /olvidaste tu contraseña/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toBe("/forgot-password");
    expect(href).not.toContain("hub.example");
  });
});
