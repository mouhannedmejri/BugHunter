import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (token) {
      setVerifying(true);
      api
        .verifyEmail(token)
        .then(() => setVerified(true))
        .catch((err) => setError(err.message || "Verification failed"))
        .finally(() => setVerifying(false));
    }
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    // TODO: implement resend endpoint
    setTimeout(() => {
      setResending(false);
      setResent(true);
    }, 1500);
  };

  // Token present — show verification result
  if (token) {
    if (verifying) {
      return (
        <AuthLayout title="Verifying…" subtitle="Please wait while we verify your email">
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          </div>
        </AuthLayout>
      );
    }

    if (verified) {
      return (
        <AuthLayout title="Email verified" subtitle="Your email has been confirmed">
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Your email is confirmed. Sign in to continue onboarding: choose to run an organization (setup and
              super-admin approval) or join as a researcher.
            </p>
            <Button asChild className="h-11 w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </div>
        </AuthLayout>
      );
    }

    return (
      <AuthLayout title="Verification failed" subtitle="We couldn't verify your email">
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-7 w-7 text-destructive" />
          </div>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // No token — show "check your email" screen
  return (
    <AuthLayout title="Check your email" subtitle="We sent a verification link to your inbox">
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Click the link in the email to verify your account, then sign in to finish onboarding. If you do not see the
          message, check your spam folder.
        </p>
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={handleResend}
          disabled={resending || resent}
        >
          {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {resent ? "Email resent ✓" : "Resend verification email"}
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default VerifyEmail;
