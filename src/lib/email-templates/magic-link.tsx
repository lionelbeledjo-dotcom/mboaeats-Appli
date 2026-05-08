import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de connexion {siteName} : {token ?? '------'}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{siteName}</Text>
        </Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Votre code de connexion</Heading>
          <Text style={styles.text}>
            Saisissez ce code à 6 chiffres dans l'application {siteName} pour vous connecter.
            Il est valable 10 minutes.
          </Text>
          <Text style={styles.code}>{token ?? '------'}</Text>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Vous n'avez pas demandé ce code ? Ignorez cet email — votre compte reste sécurisé.
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
