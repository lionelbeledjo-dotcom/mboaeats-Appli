import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props { reference?: string; order_id?: string; restaurant_name?: string }

const OrderDeliveredClient = ({ reference = '', order_id = '', restaurant_name = '' }: Props) => (
  <EmailShell preview="Commande livrée - Bon appétit !">
    <Heading style={styles.h1}>🎉 Commande livrée — Bon appétit !</Heading>
    <Text style={styles.text}>
      Votre commande {reference ? <strong>{reference}</strong> : null}
      {restaurant_name ? <> de <strong>{restaurant_name}</strong></> : null} vient d'être livrée.
    </Text>
    <Text style={styles.text}>
      Régalez-vous ! N'hésitez pas à laisser un avis pour aider la communauté MboaEats.
    </Text>
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/suivi/${order_id}`} style={styles.button}>
        Laisser un avis
      </Button>
    </Section>
  </EmailShell>
)

export const template = {
  component: OrderDeliveredClient,
  subject: '🎉 Commande livrée - Bon appétit !',
  displayName: 'Commande livrée (client)',
  previewData: { reference: 'MBE-123456', order_id: 'abc-123', restaurant_name: 'Chez Maman' },
} satisfies TemplateEntry

export default OrderDeliveredClient
