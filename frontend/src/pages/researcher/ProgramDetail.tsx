import { useParams, Link } from "react-router-dom";
import { mockPrograms, mockReports, mockLeaderboard, formatCurrency } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { MarkdownContent } from "@/components/MarkdownContent";
import { Building2, ArrowLeft, Send, Lock, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/mock-data";

const severityOrder: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];

const ProgramDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const program = mockPrograms.find((p) => p.slug === slug);

  if (!program) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Program not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/programs">Back to programs</Link>
        </Button>
      </div>
    );
  }

  const programReports = mockReports.filter((r) => r.programSlug === slug);
  const inScope = program.assets.filter((a) => a.inScope);
  const outOfScope = program.assets.filter((a) => !a.inScope);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back link */}
      <Link to="/programs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to programs
      </Link>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{program.title}</h1>
          <p className="text-sm text-muted-foreground">{program.orgName}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
              {program.type}
            </Badge>
            <Badge variant="outline" className={cn("text-xs font-medium", program.status === "ACTIVE" ? "bg-success/15 text-green-600 border-success/30" : "bg-muted text-muted-foreground border-border")}>
              {program.status}
            </Badge>
            {program.requiresInvite && (
              <Badge variant="outline" className="text-xs font-medium bg-muted text-muted-foreground border-border">
                <Lock className="h-3 w-3 mr-1" /> Invite Only
              </Badge>
            )}
          </div>
        </div>
        <Button asChild className="gap-2 shrink-0" size="lg">
          <Link to={`/programs/${program.slug}/submit`}>
            <Send className="h-4 w-4" /> Submit Report
          </Link>
        </Button>
      </div>

      {/* Reward Table */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-2 text-center">
            {severityOrder.map((sev) => {
              const tier = program.rewardTiers?.[sev] ?? { min: 0, max: 0 };
              return (
                <div key={sev} className="space-y-1">
                  <SeverityBadge severity={sev} />
                  <p className="text-sm font-semibold text-foreground">
                    {tier.max === 0 ? "—" : `${formatCurrency(tier.min)} – ${formatCurrency(tier.max)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="my-reports">My Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent><MarkdownContent body={program.description} /></CardContent>
          </Card>
          {program.eligibility && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Eligibility</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{program.eligibility}</p></CardContent>
            </Card>
          )}
          {program.safeHarbor && (
            <Card>
              <CardHeader><CardTitle className="text-base">Safe Harbor</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{program.safeHarbor}</p></CardContent>
            </Card>
          )}
          {program.disclosurePolicy && (
            <Card>
              <CardHeader><CardTitle className="text-base">Disclosure Policy</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{program.disclosurePolicy}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scope" className="mt-4 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base text-green-600">In Scope</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Identifier</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inScope.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell><Badge variant="outline" className="text-[11px]">{a.type}</Badge></TableCell>
                      <TableCell className="font-mono text-sm text-foreground">{a.identifier}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{a.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {outOfScope.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-destructive">Out of Scope</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead className="hidden sm:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outOfScope.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell><Badge variant="outline" className="text-[11px]">{a.type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{a.identifier}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{a.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Researcher</TableHead>
                    <TableHead className="text-right">Reputation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockLeaderboard.slice(0, 10).map((entry) => (
                    <TableRow key={entry.rank} className={cn(entry.isCurrentUser && "bg-primary/5")}>
                      <TableCell className="font-bold text-muted-foreground">{entry.rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                              {entry.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn("text-sm font-medium", entry.isCurrentUser ? "text-primary" : "text-foreground")}>
                            {entry.username}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{entry.reputation.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-reports" className="mt-4">
          <Card>
            {programReports.length === 0 ? (
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">You haven't submitted any reports to this program yet.</p>
                <Button asChild className="mt-4 gap-2">
                  <Link to={`/programs/${program.slug}/submit`}>
                    <Send className="h-4 w-4" /> Submit your first report
                  </Link>
                </Button>
              </CardContent>
            ) : (
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Reward</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-foreground max-w-[200px] truncate">{r.title}</TableCell>
                        <TableCell><SeverityBadge severity={r.severity} /></TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{format(new Date(r.createdAt), "MMM d")}</TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-sm font-medium">
                          {r.reward ? formatCurrency(r.reward) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgramDetail;
