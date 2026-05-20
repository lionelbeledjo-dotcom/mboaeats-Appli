import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props {
  reference?: string
  restaurant_name?: string
  reason?: string
}

const OrderRejectedClient = ({ reference = '', restaurant_name = 'Le restaurant', reason }: Props) => (
  <EmailShell preview="Votre commande n'a pas pu être acceptée">
    <Heading style={styles.h1}>Commande non acceptée</Heading>
    <Text style={styles.text}>
      Nous sommes désolés, <strong>{restaurant_name}</strong> n'a pas pu accepter votre commande
      {reference ? ` ${reference}` : ''}.
    </Text>
    {reason ? (
      <Section style={{ padding: '12px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', margin: '16px 0' }}>
        <Text style={{ ...styles.text, margin: 0 }}>
          <strong>Motif :</strong> {reason}
        </Text>
      </Section>
    ) : null}
    <Text style={styles.text}>
      Aucun montant ne sera prélevé. Vous pouvez choisir un autre restaurant ou réessayer plus tard.
    </Text>
    <Text style={styles.textMuted}>Merci de votre compréhension — l'équipe MboaEats.</Text>
  </EmailShell>
)

export const template = {
  component: OrderRejectedClient,
  subject: "Votre commande n'a pas pu être acceptée",
  displayName: 'Commande refusée (client)',
  previewData: { reference: 'MBE-123456', restaurant_name: 'Chez Maman', reason: 'Plus de stock sur un plat' },
} satisfies TemplateEntry

export default OrderRejectedClient
