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

export type OrgVerificationSubmittedEmailProps = {
  orgName: string;
  username: string;
  createdAt: string;
  country: string;
  plannedPrograms: number;
  website: string;
  adminUrl: string;
};

export default function OrgVerificationSubmittedEmail({
  orgName,
  username,
  createdAt,
  country,
  plannedPrograms,
  website,
  adminUrl,
}: OrgVerificationSubmittedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verification Submitted — {orgName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Verification Submitted</Heading>
          <Text style={text}>
            <strong>{orgName}</strong> has submitted their verification documents for review.
          </Text>
          <Text style={text}>
            The organization has uploaded their documents and is awaiting approval.
          </Text>

          <Section style={infoSection}>
            <Text style={infoLabel}>Organization Name</Text>
            <Text style={infoValue}>{orgName}</Text>

            <Text style={infoLabel}>Submitted By</Text>
            <Text style={infoValue}>@{username}</Text>

            <Text style={infoLabel}>Country</Text>
            <Text style={infoValue}>{country}</Text>

            <Text style={infoLabel}>Planned Programs</Text>
            <Text style={infoValue}>{plannedPrograms}</Text>

            {website && (
              <>
                <Text style={infoLabel}>Website</Text>
                <Text style={infoValue}>{website}</Text>
              </>
            )}
          </Section>

          <Section style={btnSection}>
            <Button href={adminUrl} style={button}>
              Quick Review
            </Button>
          </Section>

          <Text style={muted}>
            Please review the verification documents and approve or reject the organization.
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

const infoSection = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const infoLabel = {
  color: '#71717a',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  margin: '12px 0 4px',
};

const infoValue = {
  color: '#18181b',
  fontSize: '14px',
  margin: '0',
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
