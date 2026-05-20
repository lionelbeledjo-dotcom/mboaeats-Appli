import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SUPPORT_EMAIL, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props { restaurant_name?: string; reason?: string }

const RestaurantRejected = ({ restaurant_name = 'Votre restaurant', reason }: Props) => (
  <EmailShell preview="Candidature restaurant non retenue">
    <Heading style={styles.h1}>Candidature non retenue</Heading>
    <Text style={styles.text}>
      Bonjour, après examen, nous ne pouvons pas valider <strong>{restaurant_name}</strong> sur MboaEats pour le moment.
    </Text>
    {reason ? (
      <Section style={{ padding: '12px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', margin: '16px 0' }}>
        <Text style={{ ...styles.text, margin: 0 }}>
          <strong>Motif :</strong> {reason}
        </Text>
      </Section>
    ) : null}
    <Text style={styles.text}>
      Vous pouvez corriger les informations et soumettre à nouveau votre candidature.
      Pour toute question, écrivez-nous à <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.link}>{SUPPORT_EMAIL}</a>.
    </Text>
  </EmailShell>
)

export const template = {
  component: RestaurantRejected,
  subject: 'Candidature restaurant non retenue',
  displayName: 'Restaurant refusé',
  previewData: { restaurant_name: 'Chez Maman', reason: 'Documents manquants' },
} satisfies TemplateEntry

export default RestaurantRejected
