import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Link2, Loader2 } from "lucide-react";
import { mockTriageReports } from "@/lib/org-mock-data";
import { toast } from "sonner";

interface DuplicatePickerProps {
  currentReportId: string;
  onSelect: (reportId: string) => void;
  /** When set, live search replaces mock data (e.g. GET /search/reports). */
  fetchMatches?: (q: string) => Promise<Array<{ id: string; title: string }>>;
}

export const DuplicatePicker = ({ currentReportId, onSelect, fetchMatches }: DuplicatePickerProps) => {
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<Array<{ id: string; title: string }>>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    if (!fetchMatches || query.length < 2) {
      setRemoteResults([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setRemoteLoading(true);
      void fetchMatches(query)
        .then((rows) => {
          if (!cancelled) setRemoteResults(rows.filter((r) => r.id !== currentReportId).slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setRemoteResults([]);
        })
        .finally(() => {
          if (!cancelled) setRemoteLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, fetchMatches, currentReportId]);

  const mockResults =
    !fetchMatches && query.length >= 2
      ? mockTriageReports
          .filter(
            (r) => r.id !== currentReportId && r.title.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const results = fetchMatches
    ? remoteResults.map((r) => ({ id: r.id, title: r.title, shortId: r.id.slice(0, 8) }))
    : mockResults.map((r) => ({ id: r.id, title: r.title, shortId: r.shortId }));

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mark as Duplicate Of</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search reports by title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 pl-8 text-sm"
        />
        {fetchMatches && remoteLoading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
      {results.length > 0 && (
        <div className="border border-border rounded-md divide-y divide-border max-h-48 overflow-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
              onClick={() => {
                onSelect(r.id);
                toast.success(`Marked duplicate of ${r.shortId}`);
                setQuery("");
              }}
            >
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-xs text-muted-foreground">{r.shortId}</span>
              <span className="truncate">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
