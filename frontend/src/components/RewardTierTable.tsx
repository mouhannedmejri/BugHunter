import { Input } from "@/components/ui/input";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { Severity } from "@/lib/mock-data";

interface RewardTier {
  min: number;
  max: number;
}

interface RewardTierTableProps {
  value: Record<Severity, RewardTier>;
  onChange: (value: Record<Severity, RewardTier>) => void;
  readonly?: boolean;
}

const severities: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];

export const RewardTierTable = ({ value, onChange, readonly }: RewardTierTableProps) => {
  const handleChange = (severity: Severity, field: "min" | "max", v: string) => {
    const num = parseInt(v) || 0;
    onChange({ ...value, [severity]: { ...value[severity], [field]: num * 100 } });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Severity</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Min (USD)</th>
            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Max (USD)</th>
          </tr>
        </thead>
        <tbody>
          {severities.map((s) => (
            <tr key={s} className="border-b border-border last:border-0">
              <td className="px-4 py-2"><SeverityBadge severity={s} /></td>
              <td className="px-4 py-2">
                {readonly ? (
                  <span className="font-mono">${(value[s]?.min || 0) / 100}</span>
                ) : (
                  <Input
                    type="number"
                    value={(value[s]?.min || 0) / 100}
                    onChange={(e) => handleChange(s, "min", e.target.value)}
                    className="h-8 w-28"
                  />
                )}
              </td>
              <td className="px-4 py-2">
                {readonly ? (
                  <span className="font-mono">${(value[s]?.max || 0) / 100}</span>
                ) : (
                  <Input
                    type="number"
                    value={(value[s]?.max || 0) / 100}
                    onChange={(e) => handleChange(s, "max", e.target.value)}
                    className="h-8 w-28"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
