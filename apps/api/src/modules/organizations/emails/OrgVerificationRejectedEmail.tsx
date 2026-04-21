import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export type OrgVerificationRejectedEmailProps = {
  orgName: string;
  orgSlug: string;
  reason: string;
  appUrl: string;
};

export default function OrgVerificationRejectedEmail({
  orgName,
  reason,
  appUrl,
}: OrgVerificationRejectedEmailProps) {
  const resubmitUrl = `${appUrl}/onboarding/verify`;

  return (
    <Html>
      <Head />
      <Preview>Action Required — {orgName} Verification</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Action Required — Verification Not Approved</Heading>

          <Text style={text}>
            We were unable to verify your organization <strong>{orgName}</strong> at this time.
          </Text>

          <Section style={reasonSection}>
            <Text style={reasonTitle}>Reason:</Text>
            <Text style={reasonText}>{reason}</Text>
          </Section>

          <Text style={text}>
            <strong>What you can do:</strong>
          </Text>

          <Section style={stepsSection}>
            <Text style={stepItem}>1. Review the reason above and address the issue</Text>
            <Text style={stepItem}>2. Gather any additional documents that may help</Text>
            <Text style={stepItem}>3. Resubmit your verification with corrected information</Text>
          </Section>

          <Section style={btnSection}>
            <Button href={resubmitUrl} style={button}>
              Resubmit Verification
            </Button>
          </Section>

          <Text style={muted}>
            If you believe this was a mistake or need assistance, please contact our support team at
            support@bughuntr.com
          </Text>

          <Text style={footer}>
            Best regards,
            <br />
            The BugHuntr Team
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

const reasonSection = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  borderLeft: '4px solid #dc2626',
};

const reasonTitle = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const reasonText = {
  color: '#991b1b',
  fontSize: '14px',
  margin: '0',
};

const stepsSection = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const stepItem = {
  color: '#3f3f46',
  fontSize: '14px',
  margin: '8px 0',
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

const footer = {
  color: '#71717a',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '24px 0 0',
};
