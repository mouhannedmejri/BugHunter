import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type OrgInviteEmailProps = {
  orgName: string;
  roleLabel: string;
  acceptUrl: string;
  tokenExpiry?: string;
};

export default function OrgInviteEmail({
  orgName,
  roleLabel,
  acceptUrl,
  tokenExpiry = '7 days',
}: OrgInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {orgName} on BugHuntr</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You've been invited to join {orgName}</Heading>

          <Text style={text}>
            You have been invited to join <strong>{orgName}</strong> on BugHuntr as a{' '}
            <strong>{roleLabel}</strong>.
          </Text>

          <Section style={btnSection}>
            <Button href={acceptUrl} style={button}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={muted}>
            This invitation expires in {tokenExpiry}. If you weren't expecting this email, you can
            safely ignore it.
          </Text>

          <Text style={fallbackText}>
            Or paste this link in your browser:
            <br />
            <Link href={acceptUrl}>{acceptUrl}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '24px',
  maxWidth: '480px',
};

const h1 = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
};

const text = {
  color: '#3f3f46',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const btnSection = {
  margin: '24px 0',
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
};

const muted = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0 0',
};

const fallbackText = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
};
