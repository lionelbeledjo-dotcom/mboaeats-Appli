import * as React from 'react'
import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailShell } from './_shell'
import { SITE_URL, styles } from './_emerald'
import type { TemplateEntry } from './registry'

interface Props { restaurant_name?: string }

const RestaurantApproved = ({ restaurant_name = 'Votre restaurant' }: Props) => (
  <EmailShell preview="Votre restaurant est validé sur MboaEats">
    <Heading style={styles.h1}>✅ Votre restaurant est validé</Heading>
    <Text style={styles.text}>
      Félicitations ! <strong>{restaurant_name}</strong> est désormais en ligne sur MboaEats
      et visible par tous les clients.
    </Text>
    <Text style={styles.text}>
      Connectez-vous pour finaliser votre menu, ajuster vos horaires et commencer à recevoir des commandes.
    </Text>
    <Section style={styles.buttonRow}>
      <Button href={`${SITE_URL}/restaurant`} style={styles.button}>
        Ouvrir mon espace
      </Button>
    </Section>
  </EmailShell>
)

export const template = {
  component: RestaurantApproved,
  subject: '✅ Votre restaurant est validé',
  displayName: 'Restaurant validé',
  previewData: { restaurant_name: 'Chez Maman' },
} satisfies TemplateEntry

export default RestaurantApproved
