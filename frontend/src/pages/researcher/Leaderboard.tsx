import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { mockLeaderboard, formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Trophy, Medal } from "lucide-react";

const Leaderboard = () => {
  const [period, setPeriod] = useState<"all" | "month">("all");

  const data = period === "month"
    ? mockLeaderboard.map((e) => ({ ...e, reputation: Math.floor(e.reputation * 0.12), accepted: Math.floor(e.accepted * 0.1), totalEarned: Math.floor(e.totalEarned * 0.08) }))
    : mockLeaderboard;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">Top researchers by reputation</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", period === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setPeriod("all")}
          >
            All Time
          </button>
          <button
            className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", period === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setPeriod("month")}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4">
        {data.slice(0, 3).map((entry, i) => (
          <Card key={entry.rank} className={cn("text-center", i === 0 && "border-yellow-400/40 bg-yellow-50/30", i === 1 && "border-gray-400/30", i === 2 && "border-orange-400/30")}>
            <CardContent className="pt-6 pb-4">
              <div className="mb-2">
                <Medal className={cn("h-6 w-6 mx-auto", i === 0 && "text-yellow-500", i === 1 && "text-gray-400", i === 2 && "text-orange-500")} />
              </div>
              <Avatar className="h-12 w-12 mx-auto mb-2">
                <AvatarFallback className={cn("text-sm font-bold", entry.isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {entry.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className={cn("font-semibold text-sm", entry.isCurrentUser ? "text-primary" : "text-foreground")}>{entry.displayName}</p>
              <p className="text-xs text-muted-foreground">@{entry.username}</p>
              <p className="text-lg font-bold text-primary mt-1">{entry.reputation.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">reputation</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Researcher</TableHead>
                <TableHead className="text-right">Reputation</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Accepted</TableHead>
                <TableHead className="text-right hidden md:table-cell">Total Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry) => (
                <TableRow key={entry.rank} className={cn(entry.isCurrentUser && "bg-primary/5 font-medium")}>
                  <TableCell className="font-bold text-muted-foreground">
                    {entry.rank <= 3 ? (
                      <Medal className={cn("h-4 w-4", entry.rank === 1 && "text-yellow-500", entry.rank === 2 && "text-gray-400", entry.rank === 3 && "text-orange-500")} />
                    ) : entry.rank}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className={cn("text-[10px]", entry.isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                          {entry.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={cn("text-sm", entry.isCurrentUser ? "text-primary font-semibold" : "text-foreground")}>
                          {entry.displayName || entry.username}
                          {entry.isCurrentUser && <span className="ml-1.5 text-xs text-muted-foreground">(You)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">@{entry.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{entry.reputation.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm hidden sm:table-cell">{entry.accepted}</TableCell>
                  <TableCell className="text-right text-sm font-medium hidden md:table-cell">{formatCurrency(entry.totalEarned)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
