import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import QRCode from "qrcode";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getMboaSession } from "./session.server";
import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotpCode,
  generateBackupCodes,
  consumeBackupCode,
} from "./totp.server";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const SESSION_TTL_HOURS = 12;

async function assertSuperadmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (error) throw new Error("Erreur de vérification du rôle");
  if (!data) throw new Error("Accès refusé");
}

async function logAttempt(userId: string, success: boolean, kind: "totp" | "backup" | "setup" | "disable") {
  try {
    const req = getRequest();
    const ua = req?.headers.get("user-agent") ?? null;
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req?.headers.get("cf-connecting-ip") ??
      null;
    await supabaseAdmin.from("superadmin_2fa_attempts").insert({
      user_id: userId,
      success,
      kind,
      ip,
      user_agent: ua,
    });
  } catch {
    // noop
  }
}

async function getRow(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("superadmin_2fa")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const get2faStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertSuperadmin(userId);
    const row = await getRow(userId);
    const session = await getMboaSession();
    const sd = session.data;
    const sessionValid =
      !!sd?.sa2faAt &&
      sd?.sa2faUserId === userId &&
      Date.now() - (sd?.sa2faAt ?? 0) < SESSION_TTL_HOURS * 3_600_000;
    const lockedUntil =
      row?.locked_until && new Date(row.locked_until).getTime() > Date.now()
        ? row.locked_until
        : null;
    return {
      enabled: !!row?.enabled,
      requiresSetup: !row?.enabled,
      verifiedAt: row?.verified_at ?? null,
      backupCodesRemaining: row?.backup_codes_hashed?.length ?? 0,
      failedAttempts: row?.failed_attempts ?? 0,
      lockedUntil,
      sessionValid,
    };
  });

export const beginSetup2fa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertSuperadmin(userId);
    const row = await getRow(userId);
    if (row?.enabled) throw new Error("La 2FA est déjà activée");

    const email = (context.claims as any)?.email ?? "superadmin";
    const secret = generateTotpSecret();
    const otpauthUrl = buildOtpAuthUrl(`MboaEats (${email})`, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 280 });
    return { secret, otpauthUrl, qrDataUrl };
  });

export const confirmSetup2fa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        secret: z.string().min(16).max(128).regex(/^[A-Z2-7]+=*$/),
        code: z.string().min(6).max(8),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    await assertSuperadmin(userId);
    const existing = await getRow(userId);
    if (existing?.enabled) throw new Error("La 2FA est déjà activée");

    if (!verifyTotpCode(data.secret, data.code)) {
      await logAttempt(userId, false, "setup");
      throw new Error("Code invalide");
    }

    const enc = encryptSecret(data.secret);
    const codes = generateBackupCodes(10);

    const { error } = await supabaseAdmin
      .from("superadmin_2fa")
      .upsert(
        {
          user_id: userId,
          enabled: true,
          secret_ciphertext: enc.ciphertext,
          secret_iv: enc.iv,
          secret_tag: enc.tag,
          verified_at: new Date().toISOString(),
          backup_codes_hashed: codes.hashed,
          failed_attempts: 0,
          locked_until: null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);

    // Marque la session comme 2FA validée
    const session = await getMboaSession();
    await session.update({
      ...session.data,
      sa2faUserId: userId,
      sa2faAt: Date.now(),
    });

    await logAttempt(userId, true, "setup");
    return { ok: true, backupCodes: codes.plain };
  });

export const verifyLogin2fa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        code: z.string().min(6).max(20),
        useBackup: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    await assertSuperadmin(userId);
    const row = await getRow(userId);
    if (!row?.enabled || !row.secret_ciphertext || !row.secret_iv || !row.secret_tag) {
      throw new Error("La 2FA n'est pas configurée");
    }
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      throw new Error(`Compte verrouillé jusqu'à ${new Date(row.locked_until).toLocaleTimeString("fr-FR")}`);
    }

    let success = false;
    let newBackup: string[] | null = null;

    if (data.useBackup) {
      const r = consumeBackupCode(row.backup_codes_hashed ?? [], data.code);
      success = r.ok;
      if (success) newBackup = r.remaining;
    } else {
      const secret = decryptSecret(row.secret_ciphertext, row.secret_iv, row.secret_tag);
      success = verifyTotpCode(secret, data.code);
    }

    if (!success) {
      const attempts = (row.failed_attempts ?? 0) + 1;
      const lock = attempts >= MAX_FAILED_ATTEMPTS;
      await supabaseAdmin
        .from("superadmin_2fa")
        .update({
          failed_attempts: lock ? 0 : attempts,
          locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
        })
        .eq("user_id", userId);
      await logAttempt(userId, false, data.useBackup ? "backup" : "totp");
      throw new Error(
        lock
          ? `Trop de tentatives. Compte verrouillé ${LOCK_MINUTES} min.`
          : `Code invalide (${MAX_FAILED_ATTEMPTS - attempts} essais restants)`,
      );
    }

    await supabaseAdmin
      .from("superadmin_2fa")
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_used_at: new Date().toISOString(),
        ...(newBackup ? { backup_codes_hashed: newBackup } : {}),
      })
      .eq("user_id", userId);

    const session = await getMboaSession();
    await session.update({
      ...session.data,
      sa2faUserId: userId,
      sa2faAt: Date.now(),
    });
    await logAttempt(userId, true, data.useBackup ? "backup" : "totp");
    return { ok: true, backupCodesRemaining: newBackup?.length ?? row.backup_codes_hashed?.length ?? 0 };
  });

export const disable2fa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ code: z.string().min(6).max(20) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    await assertSuperadmin(userId);
    const row = await getRow(userId);
    if (!row?.enabled) throw new Error("2FA inactive");
    const secret = decryptSecret(row.secret_ciphertext!, row.secret_iv!, row.secret_tag!);
    if (!verifyTotpCode(secret, data.code)) {
      await logAttempt(userId, false, "disable");
      throw new Error("Code invalide");
    }
    await supabaseAdmin
      .from("superadmin_2fa")
      .update({
        enabled: false,
        secret_ciphertext: null,
        secret_iv: null,
        secret_tag: null,
        backup_codes_hashed: [],
        verified_at: null,
      })
      .eq("user_id", userId);
    const session = await getMboaSession();
    await session.update({ ...session.data, sa2faUserId: undefined, sa2faAt: undefined });
    await logAttempt(userId, true, "disable");
    return { ok: true };
  });

export const regenerateBackupCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(6).max(20) }).parse(d))
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    await assertSuperadmin(userId);
    const row = await getRow(userId);
    if (!row?.enabled) throw new Error("2FA inactive");
    const secret = decryptSecret(row.secret_ciphertext!, row.secret_iv!, row.secret_tag!);
    if (!verifyTotpCode(secret, data.code)) throw new Error("Code invalide");
    const codes = generateBackupCodes(10);
    await supabaseAdmin
      .from("superadmin_2fa")
      .update({ backup_codes_hashed: codes.hashed })
      .eq("user_id", userId);
    return { ok: true, backupCodes: codes.plain };
  });

export const clearSa2faSession = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getMboaSession();
  await session.update({ ...session.data, sa2faUserId: undefined, sa2faAt: undefined });
  return { ok: true };
});
