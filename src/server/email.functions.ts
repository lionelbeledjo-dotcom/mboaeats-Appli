/**
 * MboaEats — Wrapper central d'envoi d'emails transactionnels via Lovable Emails.
 *
 * Conçu pour être appelé depuis d'autres server functions (fire-and-forget).
 * - Anti-doublon : (template, related_id) unique dans email_log
 * - Préférence utilisateur : notification_preferences.email_enabled
 * - Suppression list respectée
 * - try/catch silencieux : n'interrompt JAMAIS le flow métier
 *
 * NE PAS exporter de createServerFn ici — ce module est purement server-side,
 * importé uniquement par d'autres .functions.ts côté serveur.
 */
import * as React from 'react'
import { render } from '@react-email/render'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'MboaEats'
const SENDER_DOMAIN = 'notify.mboaeat.site'
const FROM_DOMAIN = 'mboaeat.site' // display from root

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface SendEmailParams {
  to: string
  template: string
  data?: Record<string, any>
  /** Pour anti-doublon : un seul email (template, related_id) sera envoyé */
  related_id?: string | null
  /** Pour vérifier la préférence email_enabled de l'utilisateur */
  user_id?: string | null
  /** Override du sujet (sinon utilise template.subject) */
  subject?: string
}

/**
 * Envoie un email transactionnel via la queue Lovable Emails.
 * Toujours fire-and-forget — n'attend pas l'envoi réel.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, template, data = {}, related_id, user_id, subject: subjectOverride } = params
  if (!to || !template) return

  let logId: string | null = null
  try {
    // 1. Préférence utilisateur
    if (user_id) {
      const { data: pref } = await supabaseAdmin
        .from('notification_preferences')
        .select('email_enabled')
        .eq('user_id', user_id)
        .maybeSingle()
      if (pref && pref.email_enabled === false) return
    }

    // 2. Suppression list
    const normalized = to.toLowerCase()
    const { data: sup } = await supabaseAdmin
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()
    if (sup) return

    // 3. Template
    const tpl = TEMPLATES[template]
    if (!tpl) {
      console.warn('[sendEmail] template not found:', template)
      return
    }

    // 4. Rendu
    const element = React.createElement(tpl.component, data)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      subjectOverride ??
      (typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject)

    // 5. INSERT pending — toujours, capture l'id
    const { data: logRow, error: logErr } = await supabaseAdmin
      .from('email_log')
      .insert({
        recipient: to,
        template,
        related_id: related_id ?? null,
        subject,
        status: 'pending',
      })
      .select('id')
      .single()
    if (logErr) {
      console.error('[sendEmail] email_log insert failed', { template, error: logErr.message })
    } else {
      logId = (logRow as { id: string }).id
    }

    // 6. Unsubscribe token
    let unsubscribeToken: string | undefined
    const { data: existingTok } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', normalized)
      .maybeSingle()
    if (existingTok && !existingTok.used_at) {
      unsubscribeToken = existingTok.token
    } else if (!existingTok) {
      unsubscribeToken = generateToken()
      await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .upsert(
          { token: unsubscribeToken, email: normalized },
          { onConflict: 'email', ignoreDuplicates: true },
        )
      const { data: re } = await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', normalized)
        .maybeSingle()
      unsubscribeToken = re?.token ?? unsubscribeToken
    } else {
      // Token utilisé → désabonné
      if (logId) {
        await supabaseAdmin
          .from('email_log')
          .update({ status: 'failed', error_message: 'unsubscribed' })
          .eq('id', logId)
      }
      return
    }

    // 7. Enqueue
    const messageId = crypto.randomUUID()
    const idempotencyKey = related_id ? `${template}-${related_id}-${messageId}` : messageId

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: template,
      recipient_email: to,
      status: 'pending',
    })

    const { error: enqErr } = await supabaseAdmin.rpc('enqueue_email' as never, {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: template,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    } as never)

    if (enqErr) {
      console.error('[sendEmail] enqueue failed', { template, error: enqErr.message })
      if (logId) {
        await supabaseAdmin
          .from('email_log')
          .update({ status: 'failed', error_message: enqErr.message })
          .eq('id', logId)
      }
      return
    }

    // 8. Marquer sent
    if (logId) {
      await supabaseAdmin
        .from('email_log')
        .update({ status: 'sent' })
        .eq('id', logId)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sendEmail] failure', { template, error: msg })
    try {
      if (logId) {
        await supabaseAdmin
          .from('email_log')
          .update({ status: 'failed', error_message: msg })
          .eq('id', logId)
      } else {
        await supabaseAdmin.from('email_log').insert({
          recipient: to,
          template,
          related_id: related_id ?? null,
          status: 'failed',
          error_message: msg,
        })
      }
    } catch {
      /* silencieux : log uniquement */
    }
  }
}


/**
 * Résout l'email d'un utilisateur via l'API admin auth.
 * Retourne null si introuvable. Silencieux en cas d'erreur.
 */
export async function getUserEmail(user_id: string | null | undefined): Promise<string | null> {
  if (!user_id) return null
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch {
    return null
  }
}

/**
 * Récupère l'email du propriétaire principal d'un restaurant.
 */
export async function getRestaurantOwnerEmail(restaurant_id: string): Promise<{ email: string | null; user_id: string | null }> {
  try {
    const { data: row } = await supabaseAdmin
      .from('restaurant_owners')
      .select('owner_id')
      .eq('restaurant_id', restaurant_id)
      .limit(1)
      .maybeSingle()
    const owner_id = (row as { owner_id?: string } | null)?.owner_id ?? null
    if (!owner_id) return { email: null, user_id: null }
    const email = await getUserEmail(owner_id)
    return { email, user_id: owner_id }
  } catch {
    return { email: null, user_id: null }
  }
}

/**
 * Liste tous les livreurs approuvés + en ligne (status != 'offline') avec leur email.
 */
export async function listOnlineApprovedDrivers(): Promise<Array<{ user_id: string; email: string }>> {
  try {
    const { data: profiles } = await supabaseAdmin
      .from('driver_profiles')
      .select('user_id')
      .eq('status', 'valide' as never)
    if (!profiles || profiles.length === 0) return []

    const ids = profiles.map((p: { user_id: string }) => p.user_id)
    const { data: locs } = await supabaseAdmin
      .from('driver_locations')
      .select('driver_id, status')
      .in('driver_id', ids)
      .neq('status', 'offline')

    const onlineIds = new Set((locs ?? []).map((l: { driver_id: string }) => l.driver_id))
    const result: Array<{ user_id: string; email: string }> = []
    for (const id of ids) {
      if (!onlineIds.has(id)) continue
      const email = await getUserEmail(id)
      if (email) result.push({ user_id: id, email })
    }
    return result
  } catch (err) {
    console.error('[listOnlineApprovedDrivers] failed', err)
    return []
  }
}
