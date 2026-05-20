import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, formatXAF, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props {
  reference?: string
  city?: string
  restaurant_name?: string
  pickup_address?: string
  delivery_address?: string
  delivery_fee?: number
}

const OrderReadyDrivers = ({
  reference = '', city = 'votre ville',
  restaurant_name = '', pickup_address = '', delivery_address = '',
  delivery_fee = 0,
}: Props) => (
  <EmailShell preview={`Course disponible à ${city}`}>
    <Heading style={styles.h1}>🚴 Course disponible</Heading>
    <Text style={styles.text}>
      Une commande {reference ? <strong>{reference}</strong> : null} est prête à être livrée à {city}.
    </Text>
    <Section>
      {restaurant_name && (
        <Text style={styles.itemRow}>📍 <strong>Pickup :</strong> {restaurant_name}{pickup_address ? ` — ${pickup_address}` : ''}</Text>
      )}
      {delivery_address && (
        <Text style={styles.itemRow}>🏠 <strong>Livraison :</strong> {delivery_address}</Text>
      )}
      <Text style={styles.total}>Rémunération : {formatXAF(delivery_fee)}</Text>
    </Section>
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/livreur`} style={styles.button}>
        Prendre la course
      </Button>
    </Section>
    <Text style={styles.textMuted}>
      Premier arrivé, premier servi. Connectez-vous vite pour la réserver.
    </Text>
  </EmailShell>
)

export const template = {
  component: OrderReadyDrivers,
  subject: (d: Record<string, any>) => `🚴 Course disponible - ${d.city ?? ''}`,
  displayName: 'Course disponible (livreur)',
  previewData: {
    reference: 'MBE-123456', city: 'Douala',
    restaurant_name: 'Chez Maman', pickup_address: 'Bonapriso',
    delivery_address: 'Akwa, rue 12', delivery_fee: 1000,
  },
} satisfies TemplateEntry

export default OrderReadyDrivers
