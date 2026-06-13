import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "./logger";

interface AuditEvent {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await (supabaseAdmin as any).from("audit_logs").insert({
      actor_id: event.actorId,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      details: event.details ?? {},
      ip_address: event.ip ?? null,
      user_agent: event.userAgent ?? null,
    });
  } catch (err) {
    logger.error("audit_log_failed", {
      action: event.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
