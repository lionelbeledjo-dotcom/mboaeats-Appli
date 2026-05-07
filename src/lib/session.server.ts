import { useSession } from "@tanstack/react-start/server";

export type MboaSession = {
  mode?: "phone" | "email";
  identifier?: string;
  channel?: "sms" | "whatsapp" | "email";
  phone?: string;
  loggedAt?: number;
};

export function getMboaSession() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET manquant ou trop court (32+ caractères requis)");
  }
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
