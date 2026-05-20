import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, formatXAF, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface OrderItem { name: string; qty: number; line_total: number }
interface Props {
  reference?: string
  items?: OrderItem[]
  total?: number
}

const OrderNewRestaurant = ({ reference = 'MBE-000000', items = [], total = 0 }: Props) => (
  <EmailShell preview={`Nouvelle commande ${reference}`}>
    <Heading style={styles.h1}>🔔 Nouvelle commande {reference}</Heading>
    <Text style={styles.text}>
      Une nouvelle commande de <strong>{formatXAF(total)}</strong> vient d'arriver.
      Connectez-vous pour l'accepter rapidement.
    </Text>
    {items.length > 0 && (
      <Section>
        {items.map((it, i) => (
          <Text key={i} style={styles.itemRow}>
            {it.qty} × {it.name} — {formatXAF(it.line_total)}
          </Text>
        ))}
        <Text style={styles.total}>Total : {formatXAF(total)}</Text>
      </Section>
    )}
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/restaurant`} style={styles.button}>
        Voir la commande
      </Button>
    </Section>
  </EmailShell>
)

export const template = {
  component: OrderNewRestaurant,
  subject: (d: Record<string, any>) =>
    `🔔 Nouvelle commande ${d.reference ?? ''} - ${formatXAF(d.total ?? 0)}`,
  displayName: 'Nouvelle commande (restaurant)',
  previewData: {
    reference: 'MBE-123456',
    items: [{ name: 'Poulet DG', qty: 1, line_total: 3500 }],
    total: 4500,
  },
} satisfies TemplateEntry

export default OrderNewRestaurant
