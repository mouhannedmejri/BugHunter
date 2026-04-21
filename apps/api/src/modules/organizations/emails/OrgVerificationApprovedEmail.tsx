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

export type OrgVerificationApprovedEmailProps = {
  orgName: string;
  orgSlug: string;
  appUrl: string;
};

export default function OrgVerificationApprovedEmail({
  orgName,
  orgSlug,
  appUrl,
}: OrgVerificationApprovedEmailProps) {
  const dashboardUrl = `${appUrl}/${orgSlug}`;

  return (
    <Html>
      <Head />
      <Preview>Your organization {orgName} is approved!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 Congratulations! Your organization is approved!</Heading>

          <Text style={text}>
            Great news! Your organization <strong>{orgName}</strong> has been verified and approved
            on BugHuntr.
          </Text>

          <Text style={text}>
            You now have full access to all features and can start running your bug bounty program.
          </Text>

          <Section style={featuresSection}>
            <Text style={featureTitle}>What you can do now:</Text>
            <Text style={featureItem}>✅ Create and manage bug bounty programs</Text>
            <Text style={featureItem}>✅ Invite researchers to your programs</Text>
            <Text style={featureItem}>✅ Define asset scope and rewards</Text>
            <Text style={featureItem}>✅ Review and triage vulnerability reports</Text>
            <Text style={featureItem}>✅ Pay out rewards to researchers</Text>
          </Section>

          <Section style={btnSection}>
            <Button href={dashboardUrl} style={button}>
              Go to Dashboard
            </Button>
          </Section>

          <Text style={muted}>
            If you have any questions or need help getting started, feel free to reach out to our
            support team.
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

const featuresSection = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const featureTitle = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px',
};

const featureItem = {
  color: '#166534',
  fontSize: '14px',
  margin: '4px 0',
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
