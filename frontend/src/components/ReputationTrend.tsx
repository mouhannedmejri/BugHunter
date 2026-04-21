import { Area, AreaChart, ResponsiveContainer } from "recharts";
type TrendPoint = { day: string; points: number };

type ReputationTrendProps = {
  trend: TrendPoint[];
};

export const ReputationTrend = ({ trend }: ReputationTrendProps) => {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <AreaChart data={trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="repGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="points"
          stroke="hsl(239, 84%, 67%)"
          strokeWidth={2}
          fill="url(#repGradient)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
