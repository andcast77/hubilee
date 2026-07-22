import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => "/app/dashboard",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: () => ({ data: undefined, isLoading: false }),
}));

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
  pushMock.mockClear();
});

describe("ProtectedRoute (unauthenticated redirect)", () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it("redirects to /login and does not render the protected view", async () => {
    render(
      <ProtectedRoute>
        <div>Protected dashboard content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const arg = replaceMock.mock.calls[0]?.[0] as string;
    expect(arg.startsWith("/login")).toBe(true);
    expect(screen.queryByText("Protected dashboard content")).toBeNull();
  });

  it("carries the original path as the `next` search param", async () => {
    render(
      <ProtectedRoute>
        <div>Protected dashboard content</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });

    const arg = replaceMock.mock.calls[0]?.[0] as string;
    expect(arg).toContain("next=");
    expect(decodeURIComponent(arg)).toContain("/app/dashboard");
  });
});
