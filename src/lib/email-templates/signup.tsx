import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre adresse email pour {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{siteName}</Text>
        </Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Bienvenue sur {siteName} 🍲</Heading>
          <Text style={styles.text}>
            Merci de rejoindre <Link href={siteUrl} style={styles.link}>{siteName}</Link> !
            Confirmez votre adresse <strong>{recipient}</strong> pour commencer à commander vos plats préférés.
          </Text>
          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button style={styles.button} href={confirmationUrl}>Confirmer mon email</Button>
          </Section>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.
          </Text>
        </Section>
        <Text style={styles.footer}>
          Besoin d'aide ? <Link href={`mailto:${SUPPORT_EMAIL}`} style={styles.link}>{SUPPORT_EMAIL}</Link><br />
          © {new Date().getFullYear()} {siteName} — Le goût du Mboa, livré chez vous.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
