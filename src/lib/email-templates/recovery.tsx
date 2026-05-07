import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialisez votre mot de passe {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{siteName}</Text>
        </Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Réinitialiser votre mot de passe</Heading>
          <Text style={styles.text}>
            Nous avons reçu une demande de réinitialisation pour votre compte {siteName}.
            Cliquez ci-dessous pour choisir un nouveau mot de passe.
          </Text>
          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button style={styles.button} href={confirmationUrl}>Réinitialiser mon mot de passe</Button>
          </Section>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Vous n'avez rien demandé ? Ignorez cet email — votre mot de passe restera inchangé.
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

export default RecoveryEmail
