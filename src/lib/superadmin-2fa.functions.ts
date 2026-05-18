/**
 * MboaEats — 2FA Superadmin (refondu)
 *
 * Changements vs ancien fichier :
 *   - `requireSupabaseAuth` + check rôle inline → `requireAuth` + helper
 *     `assertIsSuperadmin` (puisque AVANT activation 2FA, on ne peut pas
 *     utiliser `requirePlatformSuperadmin` qui exige déjà la 2FA validée).
 *   - Session transitoire = `getTransientSession` (du nouveau auth/).
 *   - SERVER_CONFIG.superadmin2fa pour les constantes.
 *   - Reste du flow inchangé (TOTP secret chiffré, backup codes hashés,
 *     lockout après MAX_FAILED_ATTEMPTS).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import QRCode from "qrcode";
import { requireAuth } from "@/auth/middlewares/requireAuth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getTransientSession } from "@/auth/session.server";
import {
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotpCode,
  generateBackupCodes,
  consumeBackupCode,
} from "./totp.server";
import { SERVER_CONFIG } from "@/shared/config/server-config";
import { enforceRateLimit } from "@/shared/server/rate-limit";

const { maxAttempts, lockMinutes, sessionTtlHours } = SERVER_CONFIG.superadmin2fa;

async function assertIsSuperadmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "superadmin")
    .maybeSingle();
  if (error) throw new Error("Erreur de vérification du rôle");
  if (!data) throw new Error("Accès refusé");
}

async function logAttempt(
  userId: string,
  success: boolean,
  kind: "totp" | "backup" | "setup" | "disable",
) {
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
    /* noop */
  }
}

/**
 * Logue un événement sensible dans audit_logs via la RPC log_audit.
 * Cible explicitement les actions superadmin qui ne déclenchent pas de
 * trigger d'audit automatique (login, 2FA, bootstrap).
 *
 * Échec silencieux par design : un défaut de logging ne doit jamais
 * bloquer une action métier déjà autorisée par les autres vérifications.
 */
async function logSecurityEvent(
  action: string,
  userId: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    const req = getRequest();
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req?.headers.get("cf-connecting-ip") ??
      null;
    const ua = req?.headers.get("user-agent") ?? null;
    await supabaseAdmin.from("audit_logs").insert({
      action,
      target_table: "superadmin_2fa",
      target_id: null,
      actor_id: userId,
      actor_role: "superadmin",
      metadata: { ...metadata, ip, user_agent: ua },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[audit] logSecurityEvent failed:", err);
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

// -----------------------------------------------------------------------------
// Status
// -----------------------------------------------------------------------------
export const get2faStatus = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertIsSuperadmin(userId);
    const row = await getRow(userId);
    const session = await getTransientSession();
    const sd = session.data;
    const sessionValid =
      !!sd?.sa2faAt &&
      sd?.sa2faUserId === userId &&
      Date.now() - (sd?.sa2faAt ?? 0) < sessionTtlHours * 3_600_000;
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

// -----------------------------------------------------------------------------
// Begin / Confirm setup
// -----------------------------------------------------------------------------
export const beginSetup2fa = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    await assertIsSuperadmin(userId);
    const row = await getRow(userId);
    if (row?.enabled) throw new Error("La 2FA est déjà activée");

    const email = context.user?.email ?? "superadmin";
    const secret = generateTotpSecret();
    const otpauthUrl = buildOtpAuthUrl(`MboaEats (${email})`, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 280,
    });
    return { secret, otpauthUrl, qrDataUrl };
  });

export const confirmSetup2fa = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    await assertIsSuperadmin(userId);
    const existing = await getRow(userId);
    if (existing?.enabled) throw new Error("La 2FA est déjà activée");

    if (!verifyTotpCode(data.secret, data.code)) {
      await logAttempt(userId, false, "setup");
      throw new Error("Code invalide");
    }

    const enc = encryptSecret(data.secret);
    const codes = generateBackupCodes(10);

    const { error } = await supabaseAdmin.from("superadmin_2fa").upsert(
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

    const session = await getTransientSession();
    await session.update({
      ...session.data,
      sa2faUserId: userId,
      sa2faAt: Date.now(),
    });

    await logAttempt(userId, true, "setup");
    // AUDIT — activation initiale 2FA superadmin. Trace l'événement de
    // sécurisation du compte.
    await logSecurityEvent("superadmin.2fa_enabled", userId, {
      backup_codes_generated: codes.plain.length,
    });
    return { ok: true, backupCodes: codes.plain };
  });

// -----------------------------------------------------------------------------
// Verify login 2FA
// -----------------------------------------------------------------------------
export const verifyLogin2fa = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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
    // RATE LIMIT : 15 essais 2FA par IP toutes les 15 min.
    // Vient en COMPLÉMENT du lockout interne (maxAttempts par compte) :
    // protège aussi contre un attaquant qui tournerait sur plusieurs
    // comptes superadmin différents depuis la même IP.
    await enforceRateLimit("sa_2fa_verify", getRequest(), {
      limit: 15,
      windowSeconds: 900,
    });
    await assertIsSuperadmin(userId);
    const row = await getRow(userId);
    if (
      !row?.enabled ||
      !row.secret_ciphertext ||
      !row.secret_iv ||
      !row.secret_tag
    ) {
      throw new Error("La 2FA n'est pas configurée");
    }
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      throw new Error(
        `Compte verrouillé jusqu'à ${new Date(row.locked_until).toLocaleTimeString("fr-FR")}`,
      );
    }

    let success = false;
    let newBackup: string[] | null = null;

    if (data.useBackup) {
      const r = consumeBackupCode(row.backup_codes_hashed ?? [], data.code);
      success = r.ok;
      if (success) newBackup = r.remaining;
    } else {
      const secret = decryptSecret(
        row.secret_ciphertext,
        row.secret_iv,
        row.secret_tag,
      );
      success = verifyTotpCode(secret, data.code);
    }

    if (!success) {
      const attempts = (row.failed_attempts ?? 0) + 1;
      const lock = attempts >= maxAttempts;
      await supabaseAdmin
        .from("superadmin_2fa")
        .update({
          failed_attempts: lock ? 0 : attempts,
          locked_until: lock
            ? new Date(Date.now() + lockMinutes * 60_000).toISOString()
            : null,
        })
        .eq("user_id", userId);
      await logAttempt(userId, false, data.useBackup ? "backup" : "totp");
      // AUDIT — tentative de connexion superadmin échouée. Critique pour
      // détecter un brute force ciblé sur un compte superadmin.
      await logSecurityEvent("superadmin.login.2fa_failure", userId, {
        method: data.useBackup ? "backup_code" : "totp",
        attempts_count: attempts,
        locked: lock,
      });
      throw new Error(
        lock
          ? `Trop de tentatives. Compte verrouillé ${lockMinutes} min.`
          : `Code invalide (${maxAttempts - attempts} essais restants)`,
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

    const session = await getTransientSession();
    await session.update({
      ...session.data,
      sa2faUserId: userId,
      sa2faAt: Date.now(),
    });
    await logAttempt(userId, true, data.useBackup ? "backup" : "totp");
    // AUDIT — connexion superadmin réussie (action sensible non triggée
    // automatiquement par les triggers de table — il faut la logger ici).
    await logSecurityEvent("superadmin.login.2fa_success", userId, {
      method: data.useBackup ? "backup_code" : "totp",
      backup_codes_remaining:
        newBackup?.length ?? row.backup_codes_hashed?.length ?? 0,
    });
    return {
      ok: true,
      backupCodesRemaining:
        newBackup?.length ?? row.backup_codes_hashed?.length ?? 0,
    };
  });

// -----------------------------------------------------------------------------
// Disable / regenerate
// -----------------------------------------------------------------------------
export const disable2fa = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ code: z.string().min(6).max(20) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    await assertIsSuperadmin(userId);
    const row = await getRow(userId);
    if (!row?.enabled) throw new Error("2FA inactive");
    const secret = decryptSecret(
      row.secret_ciphertext!,
      row.secret_iv!,
      row.secret_tag!,
    );
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
    const session = await getTransientSession();
    await session.update({
      ...session.data,
      sa2faUserId: undefined,
      sa2faAt: undefined,
    });
    await logAttempt(userId, true, "disable");
    // AUDIT — désactivation 2FA = action critique (sécurité fortement réduite).
    await logSecurityEvent("superadmin.2fa_disabled", userId, {});
    return { ok: true as const };
  });

export const regenerateBackupCodes = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d) =>
    z.object({ code: z.string().min(6).max(20) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const userId = context.userId;
    await assertIsSuperadmin(userId);
    const row = await getRow(userId);
    if (!row?.enabled) throw new Error("2FA inactive");
    const secret = decryptSecret(
      row.secret_ciphertext!,
      row.secret_iv!,
      row.secret_tag!,
    );
    if (!verifyTotpCode(secret, data.code)) throw new Error("Code invalide");
    const codes = generateBackupCodes(10);
    await supabaseAdmin
      .from("superadmin_2fa")
      .update({ backup_codes_hashed: codes.hashed })
      .eq("user_id", userId);
    return { ok: true as const, backupCodes: codes.plain };
  });

export const clearSa2faSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const session = await getTransientSession();
    await session.update({
      ...session.data,
      sa2faUserId: undefined,
      sa2faAt: undefined,
    });
    return { ok: true as const };
  },
);
