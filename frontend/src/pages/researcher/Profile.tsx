import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { ReputationTrend } from "@/components/ReputationTrend";
import { BadgeShowcase } from "@/components/BadgeShowcase";
import { Globe, Twitter, Github, MapPin, Calendar, UserPlus, Trophy, FileCheck, Shield, Star, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, apiPaths } from "@/lib/api";
import type { PublicProfile } from "@/interfaces/Interfaces";

// ── Helpers ───────────────────────────────────────────────────────────────────

const initials = (display?: string | null) =>
  (display ?? "?")
    .split(" ")
    .map((w) => w[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// ── Component ─────────────────────────────────────────────────────────────────

const Profile = () => {
  const { username } = useParams<{ username: string }>();

  const { data: profileResponse, isLoading, isError } = useQuery<PublicProfile>({
    queryKey: ["users", "profile", username ?? "me"],
    queryFn: () => 
      username 
        ? api.get<PublicProfile>(apiPaths.users.byUsername(username))
        : api.get<PublicProfile>(apiPaths.users.mePublicProfile),
    retry: 1,
    staleTime: 60_000,
  });

  const p = profileResponse;
  const profileUser = p?.user;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-foreground">Profile not found</p>
            <p className="text-sm text-muted-foreground">
              The user <strong>@{username ?? "me"}</strong> does not exist or their profile is private.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !p || !profileUser || !p.stats) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-20 w-20">
              {profileUser.avatarUrl ? <AvatarImage src={profileUser.avatarUrl} /> : null}
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials(profileUser.displayName ?? profileUser.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{profileUser.displayName || profileUser.username}</h1>
                <span className="text-muted-foreground">@{profileUser.username}</span>
                {profileUser.country && <span className="text-lg">{profileUser.country}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{profileUser.bio}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {new Date(profileUser.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                {profileUser.website && <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Globe className="h-3.5 w-3.5" /> Website</a>}
                {profileUser.twitterHandle && <a href={`https://twitter.com/${profileUser.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Twitter className="h-3.5 w-3.5" /> @{profileUser.twitterHandle}</a>}
                {profileUser.githubHandle && <a href={`https://github.com/${profileUser.githubHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Github className="h-3.5 w-3.5" /> {profileUser.githubHandle}</a>}
              </div>
            </div>
            <Button variant="outline" className="shrink-0 hidden">
              <UserPlus className="mr-2 h-4 w-4" /> Invite to Program
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Reputation", value: p.stats.reputation.toLocaleString(), icon: Star },
          { label: "Global Rank", value: `#${p.stats.rank}`, icon: Trophy },
          { label: "Reports Accepted", value: p.stats.accepted.toString(), icon: FileCheck },
          { label: "Programs", value: p.stats.programs.toString(), icon: Shield },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reputation Trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Reputation Trend (90d)</CardTitle></CardHeader>
        <CardContent><ReputationTrend trend={[]} /></CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader><CardTitle className="text-base">Badges</CardTitle></CardHeader>
        <CardContent><BadgeShowcase badges={p.badges ?? []} /></CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Accepted Reports</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(p.recentAcceptedReports ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No public reports yet.</p>
            ) : (
              (p.recentAcceptedReports ?? []).map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.program.title}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <SeverityBadge severity={r.severityValidated || r.severityEstimate} />
                    <span className="text-xs text-muted-foreground">{new Date(r.acceptedAt || r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;