import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre lien de connexion {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{siteName}</Text>
        </Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Votre lien de connexion</Heading>
          <Text style={styles.text}>
            Cliquez sur le bouton ci-dessous pour vous connecter à {siteName}. Ce lien expire rapidement.
          </Text>
          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button style={styles.button} href={confirmationUrl}>Me connecter</Button>
          </Section>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Vous n'avez pas demandé ce lien ? Ignorez cet email en toute sécurité.
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

export default MagicLinkEmail
