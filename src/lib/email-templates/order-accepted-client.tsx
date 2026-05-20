import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props {
  reference?: string
  restaurant_name?: string
  order_id?: string
  eta_minutes?: number
}

const OrderAcceptedClient = ({
  reference = '', restaurant_name = 'Le restaurant', order_id = '', eta_minutes,
}: Props) => (
  <EmailShell preview={`${restaurant_name} a accepté votre commande`}>
    <Heading style={styles.h1}>✅ Commande acceptée</Heading>
    <Text style={styles.text}>
      Bonne nouvelle ! <strong>{restaurant_name}</strong> a accepté votre commande
      {reference ? ` ${reference}` : ''} et la prépare maintenant.
    </Text>
    {eta_minutes ? (
      <Text style={styles.text}>
        Temps estimé : <strong>~{eta_minutes} minutes</strong>.
      </Text>
    ) : null}
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/suivi/${order_id}`} style={styles.button}>
        Suivre ma commande
      </Button>
    </Section>
  </EmailShell>
)

export const template = {
  component: OrderAcceptedClient,
  subject: (d: Record<string, any>) =>
    `✅ ${d.restaurant_name ?? 'Le restaurant'} a accepté votre commande`,
  displayName: 'Commande acceptée (client)',
  previewData: { reference: 'MBE-123456', restaurant_name: 'Chez Maman', order_id: 'abc-123', eta_minutes: 35 },
} satisfies TemplateEntry

export default OrderAcceptedClient
