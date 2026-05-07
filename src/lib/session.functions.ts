import { createServerFn } from "@tanstack/react-start";
import { getMboaSession, type MboaSession } from "./session.server";

export const getCurrentSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ user: MboaSession | null }> => {
    const session = await getMboaSession();
    const data = session.data;
    if (!data || !data.identifier) return { user: null };
    return { user: data };
  }
);

export const logoutSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await getMboaSession();
    await session.clear();
    return { ok: true };
  }
);
