import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vous êtes invité à rejoindre {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{siteName}</Text>
        </Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Vous êtes invité 🎉</Heading>
          <Text style={styles.text}>
            Vous avez été invité à rejoindre <Link href={siteUrl} style={styles.link}>{siteName}</Link>.
            Acceptez l'invitation pour créer votre compte.
          </Text>
          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button style={styles.button} href={confirmationUrl}>Accepter l'invitation</Button>
          </Section>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
          </Text>
        </Section>
        <Text style={styles.footer}>
          Besoin d'aide ? <Link href={`mailto:${SUPPORT_EMAIL}`} style={styles.link}>{SUPPORT_EMAIL}</Link><br />
          © {new Date().getFullYear()} {siteName}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
