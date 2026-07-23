import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RegisterPage } from "@/views/RegisterPage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/register",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
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

const turnstileToken = vi.hoisted(() => ({ value: "mock-captcha-token" as string | null }));

const authApiPostMock = vi.fn(async (endpoint: string, _data?: unknown) => {
  if (endpoint === "/register/otp/verify") {
    return { success: true, data: { registrationTicket: "mock-registration-ticket" } };
  }
  if (endpoint === "/register") {
    return { success: true, data: { user: { id: "u1" } } };
  }
  return { success: true, data: { sent: true } };
});

vi.mock("@/lib/api/client", () => ({
  authApi: {
    post: (endpoint: string, data?: unknown) => authApiPostMock(endpoint, data),
  },
  accountApi: {
    acceptPrivacy: vi.fn(async () => ({ success: true })),
  },
}));

vi.mock("@/components/auth/RegistrationTurnstile", () => ({
  RegistrationTurnstile: ({ onToken }: { onToken: (t: string | null) => void }) => {
    if (typeof onToken === "function") {
      onToken(turnstileToken.value);
    }
    return null;
  },
}));

beforeEach(() => {
  turnstileToken.value = "mock-captcha-token";
  authApiPostMock.mockReset();
  authApiPostMock.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/register/otp/verify") {
      return { success: true, data: { registrationTicket: "mock-registration-ticket" } };
    }
    if (endpoint === "/register") {
      return { success: true, data: { user: { id: "u1" } } };
    }
    return { success: true, data: { sent: true } };
  });
});

afterEach(() => {
  cleanup();
});

describe("RegisterPage OTP shell", () => {
  it("renders Hubilee Pos BrandMark and no AuthBrand chrome", () => {
    render(<RegisterPage />);
    expect(screen.queryByText("Registrarse")).toBeNull();
    const brandLinks = screen.getAllByRole("link", { name: /hubilee pos/i });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("OTP flow: send → verify → register; never calls register/link/*", async () => {
    render(<RegisterPage />);

    const textInputs = screen.getAllByRole("textbox");
    fireEvent.change(textInputs[0], { target: { value: "juan@test.com" } });
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(passwordInputs[0], { target: { value: "SecurePass1" } });

    fireEvent.click(screen.getByRole("button", { name: /registrar empresa/i }));

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/register/otp/send",
        expect.objectContaining({
          email: "juan@test.com",
        }),
      );
    });

    expect(
      authApiPostMock.mock.calls.every(([ep]) => !String(ep).includes("/register/link/")),
    ).toBe(true);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("000000"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verificar código/i }));

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/register/otp/verify",
        expect.objectContaining({
          email: "juan@test.com",
          code: "123456",
        }),
      );
    });

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/register",
        expect.objectContaining({
          email: "juan@test.com",
          password: "SecurePass1",
          registrationTicket: "mock-registration-ticket",
          posEnabled: true,
          hrEnabled: false,
        }),
      );
    });

    expect(
      authApiPostMock.mock.calls.some(([ep]) => String(ep).includes("/register/link/")),
    ).toBe(false);
  });

  it("does not block submit when captcha token is null", async () => {
    turnstileToken.value = null;
    render(<RegisterPage />);
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "nocaptcha@test.com" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], {
      target: { value: "SecurePass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /registrar empresa/i }));

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith(
        "/register/otp/send",
        expect.objectContaining({ email: "nocaptcha@test.com" }),
      );
    });
  });

  it("opens terms dialog when clicking terms link", () => {
    render(<RegisterPage />);
    fireEvent.click(screen.getByText("términos y condiciones"));
    expect(screen.getByText("Términos y Condiciones")).not.toBeNull();
  });
});
