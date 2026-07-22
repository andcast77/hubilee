import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccountPage } from "@/views/POSPages";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => "/app/account",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

const authApiPostMock = vi.fn(async (_endpoint: string) => ({ success: true }));
vi.mock("@/lib/api/client", () => ({
  authApi: { post: (endpoint: string) => authApiPostMock(endpoint) },
}));

const clearDesktopSessionMock = vi.fn(async () => {});
vi.mock("@/lib/platform", () => ({
  clearDesktopSession: () => clearDesktopSessionMock(),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({
    data: { id: "user-1", email: "cajero@test.com" },
    isLoading: false,
  }),
}));

vi.mock("@/components/providers/StoreContext", () => ({
  useStoreContextOptional: () => ({ currentStoreId: "store-1" }),
}));

const useOpenCashSessionsForSwitchMock = vi.fn(() => ({
  data: [] as Array<{ id: string; openedByUserId: string; status: string }>,
  isLoading: false,
}));
vi.mock("@/hooks/useCashSession", () => ({
  useOpenCashSession: () => ({ session: null, isLoading: false }),
  useOpenCashSessionsByStore: () => ({ data: [], isLoading: false }),
  useOpenCashSessionsForSwitch: () => useOpenCashSessionsForSwitchMock(),
}));

afterEach(() => {
  cleanup();
  authApiPostMock.mockClear();
  clearDesktopSessionMock.mockClear();
  pushMock.mockClear();
  replaceMock.mockClear();
  useOpenCashSessionsForSwitchMock.mockReset();
  useOpenCashSessionsForSwitchMock.mockReturnValue({ data: [], isLoading: false });
});

describe("AccountPage logout (desktop session cleanup)", () => {
  it("calls the API logout endpoint and clears the desktop token storage, then redirects to /login", async () => {
    render(<AccountPage />);

    const logoutButton = await screen.findByRole("button", { name: "Cerrar sesion" });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith("/logout");
    });
    await waitFor(() => {
      expect(clearDesktopSessionMock).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
      expect(String(replaceMock.mock.calls[0]?.[0])).toMatch(/^\/login/);
    });
  });

  it("blocks Cambiar operador while the current user has OPEN cash (no logout)", async () => {
    useOpenCashSessionsForSwitchMock.mockReturnValue({
      data: [{ id: "cs-1", openedByUserId: "user-1", status: "OPEN" }],
      isLoading: false,
    });

    render(<AccountPage />);

    const switchButton = await screen.findByRole("button", { name: "Cambiar operador" });
    fireEvent.click(switchButton);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((await screen.findByRole("alert")).textContent).toMatch(/cerrar la caja/i);
    expect(authApiPostMock).not.toHaveBeenCalled();
  });

  it("allows Cambiar operador after cash is closed (logout then login)", async () => {
    useOpenCashSessionsForSwitchMock.mockReturnValue({ data: [], isLoading: false });

    render(<AccountPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Cambiar operador" }));

    await waitFor(() => {
      expect(authApiPostMock).toHaveBeenCalledWith("/logout");
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
      expect(String(replaceMock.mock.calls[0]?.[0])).toMatch(/^\/login/);
    });
  });
});
