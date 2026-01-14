
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { PaymentCycleMetric, ForecastSummary, PurchaseRecord } from '../../types';
import { CustomTooltip } from '../ChartTooltip';

// ------------------------------------------------------------------
// 1. Payment Cycle Analysis Chart (Median Days)
// ------------------------------------------------------------------
interface CycleProps {
  data: PaymentCycleMetric[];
  sortBy: 'MEDIAN' | 'AMOUNT';
}

export const PaymentCycleBarChart: React.FC<CycleProps> = ({ data, sortBy }) => {
  const chartData = useMemo(() => {
    // Clone and Sort
    const sorted = [...data].sort((a, b) => {
      if (sortBy === 'MEDIAN') return b.medianDays - a.medianDays;
      return b.totalAmount - a.totalAmount;
    });
    return sorted;
  }, [data, sortBy]);

  // Color Scale based on median days (Higher = Darker/Redder)
  const getColor = (days: number) => {
    // Cap at 60 days for max intensity
    const intensity = Math.min(days / 60, 1);
    // Interpolate between nice Blue and Danger Red
    // This is a CSS trick, but for Recharts we need hex. 
    // Let's simple use opacity of red or index based palette.
    // Let's use HSL Red.
    return `hsl(0, ${50 + (intensity * 50)}%, ${70 - (intensity * 20)}%)`;
  };

  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="companyName"
            stroke="#94a3b8"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#94a3b8' }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
            label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#64748b' }}
          />
          <Tooltip
            cursor={{ fill: '#ffffff10' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as PaymentCycleMetric;
                return (
                  <div className="bg-scifi-bg/95 border border-scifi-border p-3 rounded shadow-xl backdrop-blur-md text-xs min-w-[200px]">
                    <div className="font-bold text-scifi-primary mb-2 border-b border-scifi-border pb-1">{d.companyName}</div>
                    <div className="space-y-1 font-mono text-gray-300">
                      <div className="flex justify-between"><span>发票数量:</span> <span className="text-white">{d.invoiceCount}</span></div>
                      <div className="flex justify-between"><span>发票金额:</span> <span className="text-scifi-accent">${d.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      <div className="border-t border-gray-700 my-1"></div>
                      <div className="flex justify-between"><span>付款天数中位数:</span> <span className="text-white font-bold">{d.medianDays.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>最短付款天数:</span> <span className="text-white">{d.minDays.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>最长付款天数:</span> <span className="text-white">{d.maxDays.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>平均付款天数:</span> <span className="text-white">{d.avgDays.toFixed(2)}</span></div>
                    </div>
                  </div>
                )
              }
              return null;
            }}
          />
          <Bar dataKey="medianDays" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.medianDays)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


// ------------------------------------------------------------------
// 2. Forecast Summary Chart (Dept / Company)
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// 2. Forecast Summary Chart (Dept / Company)
// ------------------------------------------------------------------
interface ForecastProps {
  data: ForecastSummary;
  historyData?: PurchaseRecord[]; // Added for rich tooltip context
  view: 'DEPT' | 'COMPANY';
  selectedDept?: string;
  onBarClick?: (data: any) => void;
}

export const ForecastChart: React.FC<ForecastProps> = ({ data, historyData, view, selectedDept, onBarClick }) => {

  const chartData = useMemo(() => {
    if (view === 'DEPT') {
      return Object.entries(data.byDept)
        .map(([name, amount]) => ({ name, amount: amount as number }))
        .sort((a, b) => b.amount - a.amount);
    } else {
      if (!selectedDept || !data.byDeptCompany[selectedDept]) return [];

      return Object.entries(data.byDeptCompany[selectedDept])
        .map(([name, amount]) => {
          // Enrich with details for Tooltip
          // FIX: Filter by BOTH Company Name AND Selected Department to avoid cross-dept contamination
          const companyRecords = data.allRecords.filter(r => r.companyName === name && r.department === selectedDept);
          const companyHistory = historyData ? historyData.filter(r => r.companyName === name && r.department === selectedDept && r.checkDate) : [];

          // 1. Median Days (Average of predicted payments for this company in this dept)
          const medianDays = companyRecords.length > 0
            ? companyRecords.reduce((sum, r) => sum + r.medianDays, 0) / companyRecords.length
            : 0;

          // 2. Latest Invoice Date (from Unpaid/Predicted)
          const latestInvoice = companyRecords.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())[0];

          // 3. Latest Check Info (from History)
          const latestCheck = companyHistory.sort((a, b) => new Date(b.checkDate).getTime() - new Date(a.checkDate).getTime())[0];

          return {
            name,
            amount: amount as number,
            // Tooltip Data
            medianDays,
            latestInvoiceDate: latestInvoice?.invoiceDate,
            latestCheckDate: latestCheck?.checkDate,
            checkNumber: latestCheck?.checkNumber,
            checkTotal: latestCheck?.checkTotalAmount
          };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 20); // Top 20
    }
  }, [data, historyData, view, selectedDept]);

  // Custom Tooltip for Forecast Chart
  const ForecastTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-[#0f172a]/95 border border-scifi-border p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs min-w-[250px]">
          <div className="font-bold text-white text-sm mb-3 border-b border-gray-700 pb-2 flex justify-between items-center">
            <span>{d.name}</span>
            {d.medianDays > 0 && <span className="text-[10px] bg-scifi-primary/20 text-scifi-primary px-2 py-0.5 rounded-full">{d.medianDays.toFixed(0)} Days Avg</span>}
          </div>

          <div className="space-y-3 font-mono">
            {/* Main Amount */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">应付款:</span>
              <span className="text-scifi-warning font-bold text-sm">${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {/* Median Days */}
            {d.medianDays > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">付款账期中位数:</span>
                <span className="text-white">{d.medianDays.toFixed(0)} 天</span>
              </div>
            )}

            {/* Separator */}
            {(d.latestInvoiceDate || d.latestCheckDate) && <div className="border-t border-gray-700 my-2" />}

            {/* Latest Invoice */}
            {d.latestInvoiceDate && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">最近付款发票日期:</span>
                <span className="text-white">{d.latestInvoiceDate.slice(0, 10)}</span>
              </div>
            )}

            {/* Check Info */}
            {d.latestCheckDate && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">最近开支票日期:</span>
                  <span className="text-white">{d.latestCheckDate.slice(0, 10)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">支票号:</span>
                  <span className="text-scifi-primary">{d.checkNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">付款支票总额:</span>
                  <span className="text-scifi-success">${(d.checkTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return <div className="h-96 flex items-center justify-center text-gray-500 font-mono">No forecasted payments due this week.</div>
  }

  return (
    <div className="h-[450px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#94a3b8' }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<ForecastTooltip />} cursor={{ fill: '#ffffff10' }} />
          <Bar
            dataKey="amount"
            name="Due Amount"
            radius={[4, 4, 0, 0]}
            onClick={(data) => {
              if (onBarClick && data && data.name) {
                onBarClick(data.name);
              }
            }}
            cursor={onBarClick ? "pointer" : "default"}
          >
            {chartData.map((entry, index) => {
              // Varied Palette: Cyan, Purple, Pink, Orange, Emerald, Blue, Yellow, Indigo, Red, Teal
              const colors = [
                '#06b6d4', // Cyan
                '#8b5cf6', // Purple
                '#ec4899', // Pink
                '#f97316', // Orange
                '#10b981', // Emerald
                '#3b82f6', // Blue
                '#eab308', // Yellow
                '#6366f1', // Indigo
                '#ef4444', // Red
                '#14b8a6', // Teal
              ];
              const color = colors[index % colors.length];
              return <Cell key={`cell-${index}`} fill={color} cursor={onBarClick ? "pointer" : "default"} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
