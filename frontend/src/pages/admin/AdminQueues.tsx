import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { mockQueues } from "@/lib/admin-mock-data";
import { toast } from "sonner";

const failedJobs = [
  { id: "fj1", queue: "email-notifications", error: "SMTP connection timeout", createdAt: "2026-04-07T22:15:00Z", attempts: 3 },
  { id: "fj2", queue: "payout-processing", error: "Stripe API rate limit exceeded", createdAt: "2026-04-07T18:30:00Z", attempts: 2 },
  { id: "fj3", queue: "webhook-delivery", error: "Target server returned 503", createdAt: "2026-04-06T14:00:00Z", attempts: 5 },
];

const AdminQueues = () => {
  const [queues, setQueues] = useState(mockQueues);

  const togglePause = (name: string) => {
    setQueues((prev) => prev.map((q) => q.name === name ? { ...q, paused: !q.paused } : q));
    toast.success(`Queue ${name} ${queues.find((q) => q.name === name)?.paused ? "resumed" : "paused"}`);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Queues</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {queues.map((q) => (
          <Card key={q.name}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-mono text-sm font-semibold">{q.name}</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePause(q.name)}>
                  {q.paused ? <Play className="h-3.5 w-3.5 text-success" /> : <Pause className="h-3.5 w-3.5 text-warning" />}
                </Button>
              </div>
              {q.paused && <Badge variant="secondary" className="text-[10px] mb-3">Paused</Badge>}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Waiting:</span> <span className="font-mono font-medium">{q.waiting}</span></div>
                <div><span className="text-muted-foreground">Active:</span> <span className="font-mono font-medium text-primary">{q.active}</span></div>
                <div><span className="text-muted-foreground">Completed:</span> <span className="font-mono font-medium text-success">{q.completed}</span></div>
                <div><span className="text-muted-foreground">Failed:</span> <span className={`font-mono font-medium ${q.failed > 0 ? "text-destructive" : ""}`}>{q.failed}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Failed Jobs</h2>
        {failedJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed jobs.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Queue</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedJobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-sm">{j.queue}</TableCell>
                    <TableCell className="text-sm text-destructive max-w-[300px] truncate">{j.error}</TableCell>
                    <TableCell className="font-mono">{j.attempts}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(j.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => toast.success(`Retrying job ${j.id}`)}>
                          <RotateCcw className="h-3 w-3" /> Retry
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => toast.info(`Discarded job ${j.id}`)}>
                          <Trash2 className="h-3 w-3" /> Discard
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQueues;
