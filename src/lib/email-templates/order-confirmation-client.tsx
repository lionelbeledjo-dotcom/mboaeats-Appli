import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, formatXAF, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface OrderItem { name: string; qty: number; line_total: number }
interface Props {
  reference?: string
  order_id?: string
  items?: OrderItem[]
  subtotal?: number
  delivery_fee?: number
  total?: number
  restaurant_name?: string
}

const OrderConfirmationClient = ({
  reference = 'MBE-000000',
  order_id = '',
  items = [],
  subtotal = 0,
  delivery_fee = 0,
  total = 0,
  restaurant_name = 'votre restaurant',
}: Props) => (
  <EmailShell preview={`Commande ${reference} confirmée`}>
    <Heading style={styles.h1}>✅ Commande {reference} confirmée</Heading>
    <Text style={styles.text}>
      Merci ! Votre commande chez <strong>{restaurant_name}</strong> a bien été enregistrée.
    </Text>
    {items.length > 0 && (
      <Section>
        {items.map((it, i) => (
          <Text key={i} style={styles.itemRow}>
            {it.qty} × {it.name} — {formatXAF(it.line_total)}
          </Text>
        ))}
        <Text style={styles.itemRow}>Sous-total : {formatXAF(subtotal)}</Text>
        <Text style={styles.itemRow}>Livraison : {formatXAF(delivery_fee)}</Text>
        <Text style={styles.total}>Total : {formatXAF(total)}</Text>
      </Section>
    )}
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/suivi/${order_id}`} style={styles.button}>
        Suivre ma commande
      </Button>
    </Section>
    <Text style={styles.textMuted}>
      Vous recevrez un email à chaque étape (préparation, en route, livraison).
    </Text>
  </EmailShell>
)

export const template = {
  component: OrderConfirmationClient,
  subject: (d: Record<string, any>) => `Commande ${d.reference ?? ''} confirmée`,
  displayName: 'Commande confirmée (client)',
  previewData: {
    reference: 'MBE-123456',
    order_id: 'abc-123',
    items: [{ name: 'Ndolè', qty: 2, line_total: 4000 }],
    subtotal: 4000,
    delivery_fee: 1000,
    total: 5000,
    restaurant_name: 'Chez Maman',
  },
} satisfies TemplateEntry

export default OrderConfirmationClient
