// Shared brand constants for MboaEats transactional emails (vert émeraude)
export const SITE_NAME = 'MboaEats'
export const SITE_URL = 'https://mboaeat.site'
export const LOGO_URL = 'https://mboaeat.site/icon-512.png'
export const SUPPORT_EMAIL = 'contact@mboaeat.site'
export const FOOTER_TEXT = 'Plateforme de livraison au Cameroun · contact@mboaeat.site'

export const emerald = {
  primary: '#059669',        // emerald-600
  primaryDark: '#047857',    // emerald-700
  primaryLight: '#d1fae5',   // emerald-100
  text: '#0F1115',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#ffffff',
  surface: '#F9FAFB',
  danger: '#DC2626',
  warning: '#D97706',
}

const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

export const styles = {
  main: { backgroundColor: '#ffffff', fontFamily: fontStack, margin: 0, padding: 0 } as const,
  container: { maxWidth: '560px', margin: '0 auto', padding: '24px' } as const,
  bandTop: {
    backgroundColor: emerald.primary,
    height: '6px',
    borderRadius: '8px 8px 0 0',
  } as const,
  header: {
    textAlign: 'center' as const,
    padding: '24px 0 16px',
    borderBottom: `1px solid ${emerald.border}`,
  },
  logo: { width: '56px', height: '56px', borderRadius: '14px' } as const,
  brandName: {
    fontSize: '13px',
    fontWeight: 700 as const,
    letterSpacing: '0.08em',
    color: emerald.primary,
    textTransform: 'uppercase' as const,
    margin: '12px 0 0',
  },
  card: { padding: '32px 8px 8px' } as const,
  h1: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: emerald.text,
    margin: '0 0 16px',
    lineHeight: '1.3',
  } as const,
  text: {
    fontSize: '15px',
    color: emerald.text,
    lineHeight: '1.6',
    margin: '0 0 16px',
  } as const,
  textMuted: {
    fontSize: '14px',
    color: emerald.muted,
    lineHeight: '1.5',
    margin: '0 0 12px',
  } as const,
  button: {
    backgroundColor: emerald.primary,
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: 600 as const,
    display: 'inline-block',
  } as const,
  buttonRow: { textAlign: 'center' as const, margin: '24px 0' } as const,
  link: { color: emerald.primary, textDecoration: 'underline' } as const,
  hr: { borderColor: emerald.border, margin: '24px 0' } as const,
  footer: {
    fontSize: '12px',
    color: emerald.muted,
    textAlign: 'center' as const,
    padding: '16px 0',
    margin: '24px 0 0',
    borderTop: `1px solid ${emerald.border}`,
  } as const,
  itemRow: {
    fontSize: '14px',
    color: emerald.text,
    padding: '6px 0',
    borderBottom: `1px solid ${emerald.border}`,
  } as const,
  total: {
    fontSize: '16px',
    fontWeight: 700 as const,
    color: emerald.primary,
    padding: '12px 0 0',
    textAlign: 'right' as const,
  } as const,
  badge: {
    display: 'inline-block',
    backgroundColor: emerald.primaryLight,
    color: emerald.primaryDark,
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600 as const,
  } as const,
}

export function formatXAF(amount: number): string {
  return `${(amount ?? 0).toLocaleString('fr-FR')} FCFA`
}
