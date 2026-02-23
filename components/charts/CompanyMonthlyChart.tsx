import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { MonthlySummary, Language } from '../../types';
import { translations } from '../../services/translations';

interface Props {
    data: MonthlySummary[];
    department: string;
    lang: Language;
}

const COLORS = [
    "#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6",
    "#06b6d4", "#f43f5e", "#10b981", "#6366f1", "#d946ef",
    "#f97316", "#14b8a6", "#ec4899", "#84cc16", "#0ea5e9",
    "#c026d3", "#475569", "#111827", "#7c3aed", "#2563eb"
];

const CustomTooltip = ({ active, payload, label, lang }: any) => {
    if (active && payload && payload.length) {
        const t = translations[lang];
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
                    {t.headers.strategic.split('：')[0]}：{total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                    {sortedPayload.filter((e: any) => e.value > 0).map((entry: any, index: number) => {
                        const amount = entry.value;
                        const percent = total > 0 ? amount / total : 0;
                        return (
                            <div key={index} className="flex flex-col mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-gray-300">{entry.name}</span>
                                </div>
                                <div className="pl-4 text-gray-400">
                                    {t.labels.amount}：{amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <br />
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

export const CompanyMonthlyChart: React.FC<Props> = ({ data, department, lang }) => {
    const t = translations[lang];

    // Get all unique companies across all months to draw lines
    const companies = useMemo(() => {
        const all = new Set<string>();
        data.forEach(m => {
            Object.keys(m.byDepartment).forEach(c => all.add(c));
        });
        return Array.from(all);
    }, [data]);

    const chartData = useMemo(() => {
        return data.map(item => {
            const flatItem: any = {
                month: item.month,
                total: item.totalAmount // This is the total for the selected companies in this month
            };
            companies.forEach(company => {
                flatItem[company] = item.byDepartment[company] || 0;
            });
            return flatItem;
        });
    }, [data, companies]);

    return (
        <div className="flex flex-col gap-4">
            {companies.length >= 20 && (
                <div className="text-xs text-scifi-warning bg-scifi-warning/10 border border-scifi-warning/20 p-2 rounded">
                    {t.alerts.top20}
                </div>
            )}
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
                        <Tooltip content={<CustomTooltip lang={lang} />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} wrapperStyle={{ zIndex: 1000 }} />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />
                        {companies.map((company, index) => (
                            <Line
                                key={company}
                                type="monotone"
                                dataKey={company}
                                name={company}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3, strokeWidth: 1 }}
                                activeDot={{ r: 6, stroke: '#fff' }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
