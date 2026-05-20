import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props { reference?: string; order_id?: string; driver_name?: string }

const OrderPickedUpClient = ({ reference = '', order_id = '', driver_name }: Props) => (
  <EmailShell preview="Votre commande est en route">
    <Heading style={styles.h1}>🛵 Votre commande est en route</Heading>
    <Text style={styles.text}>
      {driver_name ? <><strong>{driver_name}</strong> a récupéré votre commande</> : 'Votre commande a été récupérée'}
      {reference ? ` (${reference})` : ''} et arrive vers vous.
    </Text>
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/suivi/${order_id}`} style={styles.button}>
        Suivre en temps réel
      </Button>
    </Section>
  </EmailShell>
)

export const template = {
  component: OrderPickedUpClient,
  subject: '🛵 Votre commande est en route',
  displayName: 'Commande en route (client)',
  previewData: { reference: 'MBE-123456', order_id: 'abc-123', driver_name: 'Jean' },
} satisfies TemplateEntry

export default OrderPickedUpClient
