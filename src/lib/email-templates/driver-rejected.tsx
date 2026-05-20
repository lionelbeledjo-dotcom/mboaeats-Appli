import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SUPPORT_EMAIL, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props { full_name?: string; reason?: string }

const DriverRejected = ({ full_name, reason }: Props) => (
  <EmailShell preview="Candidature livreur non retenue">
    <Heading style={styles.h1}>Candidature non retenue</Heading>
    <Text style={styles.text}>
      {full_name ? <>Bonjour <strong>{full_name}</strong>, n</> : 'N'}ous ne pouvons pas valider votre
      candidature livreur sur MboaEats pour le moment.
    </Text>
    {reason ? (
      <Section style={{ padding: '12px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', margin: '16px 0' }}>
        <Text style={{ ...styles.text, margin: 0 }}>
          <strong>Motif :</strong> {reason}
        </Text>
      </Section>
    ) : null}
    <Text style={styles.text}>
      Vous pouvez corriger vos informations (CNI, permis, photo) et soumettre à nouveau.
      Pour toute question : <a href={`mailto:${SUPPORT_EMAIL}`} style={styles.link}>{SUPPORT_EMAIL}</a>.
    </Text>
  </EmailShell>
)

export const template = {
  component: DriverRejected,
  subject: 'Candidature livreur non retenue',
  displayName: 'Livreur refusé',
  previewData: { full_name: 'Jean Mballa', reason: 'Document illisible' },
} satisfies TemplateEntry

export default DriverRejected
