// Shared brand constants for MboaEats auth emails
export const SITE_NAME = 'MboaEats'
export const SITE_URL = 'https://mboaeat.site'
export const LOGO_URL = 'https://mboaeat.site/icon-512.png'
export const SUPPORT_EMAIL = 'support@mboaeat.site'

export const brand = {
  primary: '#FF4500',
  primaryDark: '#E03E00',
  text: '#0F1115',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#ffffff',
  surface: '#FAFAF7',
}

export const styles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily:
      "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    textAlign: 'center' as const,
    padding: '8px 0 24px',
  },
  logo: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
  },
  brandName: {
    fontSize: '14px',
    fontWeight: 700 as const,
    letterSpacing: '0.08em',
    color: brand.primary,
    textTransform: 'uppercase' as const,
    margin: '12px 0 0',
  },
  card: {
    backgroundColor: brand.surface,
    border: `1px solid ${brand.border}`,
    borderRadius: '16px',
    padding: '32px 28px',
  },
  h1: {
    fontFamily: "'Sora', system-ui, sans-serif",
    fontSize: '24px',
    fontWeight: 700 as const,
    color: brand.text,
    margin: '0 0 16px',
    lineHeight: '1.25',
  },
  text: {
    fontSize: '15px',
    color: brand.text,
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  link: { color: brand.primary, textDecoration: 'underline' },
  button: {
    backgroundColor: brand.primary,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600 as const,
    borderRadius: '12px',
    padding: '14px 24px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  code: {
    fontFamily: "'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
    fontSize: '28px',
    fontWeight: 700 as const,
    letterSpacing: '0.25em',
    color: brand.text,
    backgroundColor: '#ffffff',
    border: `1px solid ${brand.border}`,
    borderRadius: '12px',
    padding: '16px 20px',
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  footer: {
    fontSize: '12px',
    color: brand.muted,
    lineHeight: '1.6',
    margin: '24px 0 0',
    textAlign: 'center' as const,
  },
}
