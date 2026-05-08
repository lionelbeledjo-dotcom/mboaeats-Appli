import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl, token }: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>🇨🇲 Bienvenue sur {siteName} — confirmez votre email pour commencer à commander</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>🇨🇲 {siteName} · Livraison Cameroun</Text>
        </Section>

        <Section style={styles.card}>
          <Heading style={styles.h1}>Akwaba sur {siteName} 🍲</Heading>

          <Text style={styles.text}>
            Bonjour 👋, et merci de rejoindre la communauté <strong>{siteName}</strong> !
            Nous sommes ravis de vous accompagner pour découvrir et commander
            <strong> les meilleurs plats du Cameroun</strong> — Ndolè, Poulet DG, Poisson braisé,
            Eru, Koki… livrés rapidement à Douala, Yaoundé et bientôt partout au Mboa.
          </Text>

          <Text style={styles.text}>
            Pour sécuriser votre compte <strong>{recipient}</strong> et activer la commande,
            il vous suffit de confirmer votre adresse email. C'est rapide, gratuit, et 100% sécurisé.
          </Text>

          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button href={confirmationUrl} style={styles.button}>
              ✅ Confirmer mon email & ouvrir l'app
            </Button>
          </Section>

          <Text style={{ ...styles.text, fontSize: '13px', color: '#6B7280', textAlign: 'center', margin: '0 0 16px' }}>
            ou saisissez ce code de vérification dans l'application :
          </Text>
          <Text style={styles.code}>{token ?? '------'}</Text>

          <Hr style={{ borderColor: '#E5E7EB', margin: '24px 0 16px' }} />

          <Text style={{ ...styles.text, fontSize: '13px', margin: 0, color: '#6B7280' }}>
            🔒 Ce lien et ce code sont valables <strong>10 minutes</strong>. Si vous n'êtes pas
            à l'origine de cette inscription, ignorez simplement cet email — aucun compte ne sera créé.
          </Text>
        </Section>

        <Text style={styles.footer}>
          Une question ? Notre équipe est à votre écoute :
          <Link href={`mailto:${SUPPORT_EMAIL}`} style={styles.link}> {SUPPORT_EMAIL}</Link><br />
          <Link href={siteUrl} style={styles.link}>{siteUrl}</Link><br />
          © {new Date().getFullYear()} {siteName} — Le goût du Mboa 🇨🇲, livré chez vous.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
