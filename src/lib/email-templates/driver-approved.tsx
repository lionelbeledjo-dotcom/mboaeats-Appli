import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props { full_name?: string }

const DriverApproved = ({ full_name }: Props) => (
  <EmailShell preview="Votre compte livreur est validé">
    <Heading style={styles.h1}>✅ Compte livreur validé</Heading>
    <Text style={styles.text}>
      {full_name ? <>Bonjour <strong>{full_name}</strong>, b</> : 'B'}ienvenue dans l'équipe MboaEats !
      Votre compte livreur est validé : vous pouvez maintenant accepter des courses.
    </Text>
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/livreur`} style={styles.button}>
        Aller à mon espace
      </Button>
    </Section>
    <Text style={styles.textMuted}>
      Activez votre statut "en ligne" pour recevoir les notifications de courses.
    </Text>
  </EmailShell>
)

export const template = {
  component: DriverApproved,
  subject: '✅ Votre compte livreur est validé',
  displayName: 'Livreur validé',
  previewData: { full_name: 'Jean Mballa' },
} satisfies TemplateEntry

export default DriverApproved
