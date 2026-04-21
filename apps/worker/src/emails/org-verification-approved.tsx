import { Html, Body, Container, Head, Heading, Text, Button, Section, Hr, Link } from '@react-email/components';

interface OrgVerificationApprovedProps {
  orgName: string;
  orgSlug: string;
  appUrl: string;
}

export default function OrgVerificationApproved({
  orgName,
  orgSlug,
  appUrl,
}: OrgVerificationApprovedProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <div style={successIcon}>✅</div>
          <Heading style={heading}>Your organization {orgName} is approved!</Heading>
          
          <Section style={section}>
            <Text style={text}>
              Congratulations! Your organization has been successfully verified and approved on BugHuntr.
            </Text>
            
            <Text style={text}>
              You can now start creating bug bounty programs, inviting team members, and managing your organization's security scope.
            </Text>
          </Section>

          <Section style={section}>
            <Text style={subheading}>What you can do now:</Text>
            
            <div style={actionList}>
              <div style={actionItem}>
                <Text style={actionText}>🎯 Create bug bounty programs</Text>
              </div>
              <div style={actionItem}>
                <Text style={actionText}>👥 Invite team members</Text>
              </div>
              <div style={actionItem}>
                <Text style={actionText}>🔐 Manage your security scope</Text>
              </div>
              <div style={actionItem}>
                <Text style={actionText}>📊 Track vulnerability reports</Text>
              </div>
            </div>
          </Section>

          <Section style={buttonSection}>
            <Button href={`${appUrl}/${orgSlug}`} style={button}>
              Go to Dashboard
            </Button>
          </Section>

          <Section style={supportSection}>
            <Text style={supportText}>
              Have questions? Our support team is here to help you get started.
            </Text>
            <Link href="mailto:support@bughuntr.io" style={supportLink}>
              Contact Support
            </Link>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            Welcome to BugHuntr! Let's make the internet more secure together.
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

const successIcon = {
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

const actionList = {
  marginBottom: '24px',
};

const actionItem = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '12px 16px',
  marginBottom: '8px',
};

const actionText = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
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
