import { useSession } from "@tanstack/react-start/server";
import { createHash } from "crypto";

export type MboaSession = {
  mode?: "phone" | "email";
  identifier?: string;
  channel?: "sms" | "whatsapp" | "email";
  phone?: string;
  loggedAt?: number;
};

export function getMboaSession() {
  const raw = process.env.SESSION_SECRET;
  if (!raw) throw new Error("SESSION_SECRET manquant");
  // Dérive une clé 64 chars (256 bits hex) à partir du secret fourni
  const password = createHash("sha256").update(raw).digest("hex");
  return useSession<MboaSession>({
    password,
    name: "mboa_session",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    },
  });
}
