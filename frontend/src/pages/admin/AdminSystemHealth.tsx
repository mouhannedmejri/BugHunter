import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, Cpu } from "lucide-react";
import { mockSystemMetrics, mockErrorLogs, mockQueues } from "@/lib/admin-mock-data";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const statusColors = { ok: "bg-success", warning: "bg-warning", critical: "bg-destructive" };

const queueSparkData = mockQueues.map((q) => ({
  name: q.name,
  data: Array.from({ length: 10 }, (_, i) => ({ x: i, y: Math.floor(Math.random() * (q.waiting + 5)) })),
}));

const AdminSystemHealth = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">System Health</h1>
        <div className="flex items-center gap-2">
          <Badge className="bg-success/10 text-success border-success/20 text-xs">v2.4.1</Badge>
          <Badge variant="outline" className="text-xs">Uptime: 99.98%</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {mockSystemMetrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <span className={`h-2 w-2 rounded-full ${statusColors[m.status]}`} />
              </div>
              <p className="text-lg font-bold font-mono">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Queue Depths</h3>
            </div>
            <div className="space-y-4">
              {queueSparkData.map((q) => (
                <div key={q.name} className="flex items-center gap-3">
                  <span className="font-mono text-xs w-40 truncate text-muted-foreground">{q.name}</span>
                  <div className="h-6 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={q.data}>
                        <Line type="monotone" dataKey="y" stroke="hsl(239,84%,67%)" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-destructive" />
              <h3 className="font-semibold">Recent Error Log</h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {mockErrorLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/50">
                  <Badge variant={log.level === "ERROR" ? "destructive" : "secondary"} className="text-[9px] shrink-0 mt-0.5">{log.level}</Badge>
                  <div className="min-w-0">
                    <p className="font-mono break-all">{log.message}</p>
                    <p className="text-muted-foreground mt-0.5">{log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Need the Layers import
import { Layers } from "lucide-react";

export default AdminSystemHealth;
