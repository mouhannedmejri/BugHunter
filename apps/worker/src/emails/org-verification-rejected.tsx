import { Html, Body, Container, Head, Heading, Text, Button, Section, Hr, Link } from '@react-email/components';

interface OrgVerificationRejectedProps {
  orgName: string;
  reason: string;
  appUrl: string;
}

export default function OrgVerificationRejected({
  orgName,
  reason,
  appUrl,
}: OrgVerificationRejectedProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <div style={warningIcon}>⚠️</div>
          <Heading style={heading}>Action Required — {orgName} Verification</Heading>
          
          <Section style={section}>
            <Text style={text}>
              We were unable to verify your organization at this time.
            </Text>
            
            <div style={reasonBox}>
              <Text style={reasonLabel}>Reason:</Text>
              <Text style={reasonText}>{reason}</Text>
            </div>
          </Section>

          <Section style={section}>
            <Text style={subheading}>What you can do:</Text>
            
            <div style={actionList}>
              <div style={actionItem}>
                <Text style={actionNumber}>1.</Text>
                <Text style={actionText}>Fix the issue mentioned in the reason above</Text>
              </div>
              <div style={actionItem}>
                <Text style={actionNumber}>2.</Text>
                <Text style={actionText}>Gather the correct verification documents</Text>
              </div>
              <div style={actionItem}>
                <Text style={actionNumber}>3.</Text>
                <Text style={actionText}>Resubmit your verification with updated information</Text>
              </div>
            </div>
          </Section>

          <Section style={buttonSection}>
            <Button href={`${appUrl}/onboarding/verify`} style={button}>
              Resubmit Verification
            </Button>
          </Section>

          <Section style={supportSection}>
            <Text style={supportText}>
              If you have questions about this decision or need help with the verification process, please don't hesitate to reach out to our support team.
            </Text>
            <Link href="mailto:support@bughuntr.io" style={supportLink}>
              Contact Support
            </Link>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            We're here to help you get verified and start securing your applications.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '20px',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '40px',
};

const warningIcon = {
  fontSize: '48px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const heading = {
  color: '#1e293b',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.25',
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const subheading = {
  color: '#475569',
  fontSize: '18px',
  fontWeight: '600',
  marginBottom: '16px',
};

const section = {
  marginBottom: '32px',
};

const text = {
  color: '#64748b',
  fontSize: '16px',
  lineHeight: '1.5',
  marginBottom: '16px',
};

const reasonBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #fecaca',
};

const reasonLabel = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
};

const reasonText = {
  color: '#1e293b',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0',
};

const actionList = {
  marginBottom: '24px',
};

const actionItem = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const actionNumber = {
  backgroundColor: '#6366f1',
  color: '#ffffff',
  borderRadius: '50%',
  fontSize: '14px',
  fontWeight: '600',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '12px',
  flexShrink: 0,
};

const actionText = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
  paddingTop: '2px',
};

const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
};

const supportSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const supportText = {
  color: '#64748b',
  fontSize: '14px',
  marginBottom: '8px',
  lineHeight: '1.5',
};

const supportLink = {
  color: '#6366f1',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  color: '#94a3b8',
  fontSize: '14px',
  textAlign: 'center' as const,
};
