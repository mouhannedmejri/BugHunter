import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api, apiPaths } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { FullPageSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InvitesAccept() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(() => Boolean(token && token.length >= 10), [token]);

  useEffect(() => {
    if (!canRun) return;
    if (!isAuthenticated) return;

    let alive = true;
    (async () => {
      setIsAccepting(true);
      setError(null);
      try {
        const result = await api.post<{ orgSlug: string; role: string }>(
          apiPaths.invites.accept(token),
        );
        if (alive) navigate(`/org/${result.orgSlug}`, { replace: true });
      } catch (e: unknown) {
        const msg =
          typeof (e as { message?: unknown } | null)?.message === "string"
            ? String((e as { message: string }).message)
            : "Failed to accept invite";
        if (alive) setError(msg);
      } finally {
        if (alive) setIsAccepting(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [canRun, isAuthenticated, navigate, token]);

  if (!canRun) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid invite link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This invitation link is missing a token or is malformed.
            </p>
            <Button onClick={() => navigate("/", { replace: true })} className="w-full">
              Go home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the token in the URL; login will come back to this page via router state "from".
    navigate("/login", { state: { from: location }, replace: true });
    return <FullPageSpinner />;
  }

  if (isAccepting) {
    return <FullPageSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Couldn’t accept invite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <FullPageSpinner />;
}

