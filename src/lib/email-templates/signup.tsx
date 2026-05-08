import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, token }: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur {siteName} — votre code : {token ?? '------'}</Preview>
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
            Saisissez le code ci-dessous dans l'app pour confirmer <strong>{recipient}</strong>
            et commencer à commander vos plats préférés.
          </Text>
          <Text style={styles.code}>{token ?? '------'}</Text>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Code valable 10 minutes. Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email.
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
