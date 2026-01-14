import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MonthlySummary } from '../../types';

interface Props {
  data: MonthlySummary[];
  departments: string[];
  type?: 'PURCHASE' | 'PAYMENT';
}

const COLORS = [
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e", "#f97316", "#eab308", "#84cc16"
];

const CustomTooltip = ({ active, payload, label, type }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.total || 0;
    const year = label.split('-')[0];
    const month = label.split('-')[1];

    // Sort payload by value descending
    const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);

    return (
      <div className="bg-slate-900 border border-scifi-border p-3 rounded shadow-xl text-xs z-50">
        <div className="font-mono text-scifi-accent mb-2 border-b border-scifi-border pb-1">
          🔹 {year}年{month} <br />
          {type === 'PAYMENT' ? '总付款金额' : '总采购金额'}：{total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </div>
        <div className="flex flex-col gap-2">
          {sortedPayload.filter((e: any) => e.value > 0).map((entry: any, index: number) => {
            const amount = entry.value;
            const percent = total > 0 ? amount / total : 0;
            return (
              <div key={index} className="flex flex-col mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-300">部门：{entry.name}</span>
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

export const MonthlyPurchaseChart: React.FC<Props> = ({ data, departments, type = 'PURCHASE' }) => {

  // Flatten data for Recharts
  const chartData = useMemo(() => {
    return data.map(item => {
      const flatItem: any = { month: item.month, total: item.totalMonthlyAmount || item.totalAmount };
      departments.forEach(dept => {
        flatItem[dept] = item.byDepartment[dept];
      });
      return flatItem;
    });
  }, [data, departments]);

  return (
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip type={type} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} wrapperStyle={{ zIndex: 1000 }} />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {departments.map((dept, index) => (
            <Line
              key={dept}
              type="monotone"
              dataKey={dept}
              name={dept}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 6, stroke: '#fff' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};