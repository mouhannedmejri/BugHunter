import { Html, Body, Container, Head, Heading, Text, Button, Section, Hr, Img } from '@react-email/components';

interface OrgInvitationProps {
  orgName: string;
  orgLogo?: string;
  role: string;
  appUrl: string;
  token: string;
}

export default function OrgInvitation({
  orgName,
  orgLogo,
  role,
  appUrl,
  token,
}: OrgInvitationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            {orgLogo ? (
              <Img src={orgLogo} alt={`${orgName} logo`} style={logo} />
            ) : (
              <div style={logoPlaceholder}>{orgName.charAt(0).toUpperCase()}</div>
            )}
            <Heading style={heading}>You've been invited to join {orgName} on BugHuntr</Heading>
          </Section>
          
          <Section style={section}>
            <Text style={text}>
              You've been invited to join <strong>{orgName}</strong> as a <strong>{role}</strong> on BugHuntr.
            </Text>
            
            <Text style={text}>
              BugHuntr is a platform where organizations can run bug bounty programs to secure their applications with the help of security researchers worldwide.
            </Text>
          </Section>

          <Section style={section}>
            <Text style={subheading}>What you'll be able to do:</Text>
            
            <div style={benefitsList}>
              <div style={benefitItem}>
                <Text style={benefitText}>🔍 Review vulnerability submissions</Text>
              </div>
              <div style={benefitItem}>
                <Text style={benefitText}>💰 Manage bounty payouts</Text>
              </div>
              <div style={benefitItem}>
                <Text style={benefitText}>📊 Track security reports</Text>
              </div>
              <div style={benefitItem}>
                <Text style={benefitText}>👥 Collaborate with security researchers</Text>
              </div>
            </div>
          </Section>

          <Section style={buttonSection}>
            <Button href={`${appUrl}/invites/accept/${token}`} style={button}>
              Accept Invitation
            </Button>
          </Section>

          <Section style={expirySection}>
            <Text style={expiryText}>
              ⏰ This invitation expires in 7 days
            </Text>
          </Section>

          <Section style={noteSection}>
            <Text style={noteText}>
              If you weren't expecting this invitation, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            Join thousands of organizations securing their applications with BugHuntr.
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

const headerSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  width: '64px',
  height: '64px',
  borderRadius: '8px',
  marginBottom: '24px',
  objectFit: 'cover' as const,
};

const logoPlaceholder = {
  width: '64px',
  height: '64px',
  borderRadius: '8px',
  backgroundColor: '#6366f1',
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 24px auto',
};

const heading = {
  color: '#1e293b',
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.25',
  marginBottom: '24px',
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

const benefitsList = {
  marginBottom: '24px',
};

const benefitItem = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '12px 16px',
  marginBottom: '8px',
};

const benefitText = {
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

const expirySection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const expiryText = {
  color: '#f59e0b',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const noteSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const noteText = {
  color: '#94a3b8',
  fontSize: '14px',
  fontStyle: 'italic',
  margin: '0',
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
