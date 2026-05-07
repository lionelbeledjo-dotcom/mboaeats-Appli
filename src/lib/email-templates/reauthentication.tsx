import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface ReauthenticationEmailProps {
  token: string
  siteName?: string
}

export const ReauthenticationEmail = ({ token, siteName = 'MboaEats' }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{siteName}</Text>
        </Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Confirmer votre identité</Heading>
          <Text style={styles.text}>Utilisez le code ci-dessous pour confirmer votre identité :</Text>
          <Text style={styles.code}>{token}</Text>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Ce code expire rapidement. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
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

export default ReauthenticationEmail
