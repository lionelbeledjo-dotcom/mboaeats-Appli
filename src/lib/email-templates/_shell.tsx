import * as React from 'react'
import {
  Body, Container, Head, Html, Img, Link, Preview, Section, Text,
} from '@react-email/components'
import { FOOTER_TEXT, LOGO_URL, SITE_NAME, SUPPORT_EMAIL, styles } from './_emerald'

interface ShellProps {
  preview: string
  children: React.ReactNode
}

export const EmailShell = ({ preview, children }: ShellProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.bandTop} />
        <Section style={styles.header}>
          <Img src={LOGO_URL} alt={SITE_NAME} width={56} height={56} style={styles.logo} />
          <Text style={styles.brandName}>{SITE_NAME}</Text>
        </Section>
        <Section style={styles.card}>{children}</Section>
        <Text style={styles.footer}>
          {FOOTER_TEXT}<br />
          <Link href={`mailto:${SUPPORT_EMAIL}`} style={styles.link}>{SUPPORT_EMAIL}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)
