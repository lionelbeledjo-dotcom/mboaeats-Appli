import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
}));

vi.mock("@/lib/superadmin-2fa.functions", () => ({
  get2faStatus: vi.fn(),
  verifyLogin2fa: vi.fn(),
}));

import { SuperAdminLoginForm } from "./SuperAdminLoginForm";

describe("SuperAdminLoginForm — bootstrap mode gating", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("affiche 'Première configuration' quand has_any_superadmin retourne false", async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    render(<SuperAdminLoginForm />);
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("has_any_superadmin");
      expect(screen.getByText("Première configuration")).toBeInTheDocument();
    });
    expect(screen.queryByText("Authentification SUPER_ADMIN")).not.toBeInTheDocument();
  });

  it("reste en mode signin quand has_any_superadmin retourne true", async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    render(<SuperAdminLoginForm />);
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("has_any_superadmin");
    });
    expect(screen.getByText("Authentification SUPER_ADMIN")).toBeInTheDocument();
    expect(screen.queryByText("Première configuration")).not.toBeInTheDocument();
  });

  it("reste en mode signin quand la RPC échoue", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<SuperAdminLoginForm />);
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith("has_any_superadmin");
    });
    expect(screen.getByText("Authentification SUPER_ADMIN")).toBeInTheDocument();
    expect(screen.queryByText("Première configuration")).not.toBeInTheDocument();
    warn.mockRestore();
  });
});
