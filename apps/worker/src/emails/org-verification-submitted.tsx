import { Html, Body, Container, Head, Heading, Text, Button, Section, Hr } from '@react-email/components';

interface OrgVerificationSubmittedProps {
  orgName: string;
  creatorUsername: string;
  createdAt: string;
  adminUrl: string;
  country: string;
  plannedPrograms: string;
  website: string;
}

export default function OrgVerificationSubmitted({
  orgName,
  creatorUsername,
  createdAt,
  adminUrl,
  country,
  plannedPrograms,
  website,
}: OrgVerificationSubmittedProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Verification Submitted — {orgName}</Heading>
          
          <Section style={section}>
            <Text style={text}>Organization verification documents have been uploaded and are ready for review:</Text>
            
            <div style={infoBox}>
              <Text style={infoLabel}>Organization Name:</Text>
              <Text style={infoValue}>{orgName}</Text>
              
              <Text style={infoLabel}>Creator Username:</Text>
              <Text style={infoValue}>{creatorUsername}</Text>
              
              <Text style={infoLabel}>Created At:</Text>
              <Text style={infoValue}>{new Date(createdAt).toLocaleDateString()} at {new Date(createdAt).toLocaleTimeString()}</Text>
              
              <div style={noticeBox}>
                <Text style={noticeText}>✅ Verification documents uploaded and ready for review</Text>
              </div>
            </div>
          </Section>

          <Section style={section}>
            <Text style={subheading}>Organization Details:</Text>
            
            <div style={statsGrid}>
              <div style={statItem}>
                <Text style={statLabel}>Country:</Text>
                <Text style={statValue}>{country}</Text>
              </div>
              
              <div style={statItem}>
                <Text style={statLabel}>Planned Programs:</Text>
                <Text style={statValue}>{plannedPrograms}</Text>
              </div>
              
              <div style={statItem}>
                <Text style={statLabel}>Website:</Text>
                <Text style={statValue}>{website}</Text>
              </div>
            </div>
          </Section>

          <Section style={buttonSection}>
            <Button href={`${adminUrl}/admin/verifications`} style={button}>
              Quick Review
            </Button>
          </Section>

          <Hr style={hr} />
          
          <Text style={footer}>
            This is an automated notification for BugHuntr administrators.
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

const heading = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: '600',
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

const infoBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  padding: '20px',
  marginBottom: '24px',
};

const infoLabel = {
  color: '#475569',
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '4px',
};

const infoValue = {
  color: '#1e293b',
  fontSize: '16px',
  marginBottom: '12px',
};

const noticeBox = {
  backgroundColor: '#dcfce7',
  borderRadius: '6px',
  padding: '12px 16px',
  marginTop: '16px',
  border: '1px solid #bbf7d0',
};

const noticeText = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
};

const statItem = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '16px',
};

const statLabel = {
  color: '#64748b',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
};

const statValue = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
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

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  color: '#94a3b8',
  fontSize: '14px',
  textAlign: 'center' as const,
};
