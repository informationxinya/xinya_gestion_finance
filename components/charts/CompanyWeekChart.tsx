import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { WeeklySummary } from '../../types';

interface Props {
  data: WeeklySummary[];
  department: string;
  type?: 'PURCHASE' | 'PAYMENT';
}

const COLORS = [
  "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb7185", "#2dd4bf", "#4ade80", "#facc15"
];

const CustomTooltip = ({ active, payload, label, type }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.total || 0;

    // Sort payload by value descending
    const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);

    return (
      <div className="bg-slate-900 border border-scifi-border p-3 rounded shadow-xl text-xs z-50">
        <div className="font-mono text-scifi-accent mb-2 border-b border-scifi-border pb-1">
          {type === 'PAYMENT' ? '周总付款金额' : '周总采购金额'}：{total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
        <div className="flex flex-col gap-2">
          {sortedPayload.filter((e: any) => e.value > 0).map((entry: any, index: number) => {
            const amount = entry.value;
            const percent = total > 0 ? amount / total : 0;
            return (
              <div key={index} className="flex flex-col mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-300">公司：{entry.name}</span>
                </div>
                <div className="pl-4 text-gray-400">
                  {type === 'PAYMENT' ? '付款金额' : '采购金额'}：{amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <br />
                  占比：{(percent * 100).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const CompanyWeekChart: React.FC<Props> = ({ data, department, type = 'PURCHASE' }) => {

  // Extract all unique companies involved in this view for coloring
  const companies = useMemo(() => {
    const s = new Set<string>();
    data.forEach(d => {
      if (d.byCompany) Object.keys(d.byCompany).forEach(k => s.add(k));
    });
    return Array.from(s);
  }, [data]);

  const chartData = useMemo(() => {
    return data.map(item => {
      const flatItem: any = { week: item.weekRange, total: item.totalWeeklyAmount || item.totalAmount };
      if (item.byCompany) {
        Object.entries(item.byCompany).forEach(([comp, amt]) => {
          flatItem[comp] = amt;
        });
      }
      return flatItem;
    });
  }, [data]);

  return (
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="week"
            stroke="#94a3b8"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            angle={-15}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
          />
          <Tooltip content={<CustomTooltip type={type} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} wrapperStyle={{ zIndex: 1000 }} />
          <Legend />
          {companies.map((comp, index) => (
            <Line
              key={comp}
              type="monotone"
              dataKey={comp}
              name={comp}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};