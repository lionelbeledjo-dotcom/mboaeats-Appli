import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { LOGO_URL, SUPPORT_EMAIL, styles } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez le changement d'email pour {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={siteName} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{siteName}</Text>
        </Section>
        <Section style={styles.card}>
          <Heading style={styles.h1}>Confirmer le changement d'email</Heading>
          <Text style={styles.text}>
            Vous avez demandé à changer votre adresse email pour {siteName} :<br />
            de <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link>{' '}
            vers <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
          </Text>
          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button style={styles.button} href={confirmationUrl}>Confirmer le changement</Button>
          </Section>
          <Text style={{ ...styles.text, fontSize: '13px', margin: 0 }}>
            Si vous n'êtes pas à l'origine de cette demande, sécurisez votre compte immédiatement.
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

export default EmailChangeEmail
