import * as React from 'react';

export default function VerifyEmail(props: { verifyUrl: string }) {
  const { verifyUrl } = props;
  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
      <h2 style={{ margin: '0 0 12px' }}>Verify your email</h2>
      <p style={{ margin: '0 0 16px', color: '#444' }}>
        Click the button below to confirm your email address and continue onboarding.
      </p>
      <p style={{ margin: '0 0 16px' }}>
        <a
          href={verifyUrl}
          style={{
            display: 'inline-block',
            padding: '10px 14px',
            background: '#4f46e5',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Verify email
        </a>
      </p>
      <p style={{ margin: '0', color: '#666', fontSize: 12 }}>
        If the button doesn’t work, copy and paste this link into your browser:
        <br />
        <a href={verifyUrl}>{verifyUrl}</a>
      </p>
    </div>
  );
}

