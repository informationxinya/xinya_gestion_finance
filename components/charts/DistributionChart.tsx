import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip } from 'recharts';
import { CompanyBubbleData } from '../../types';

interface Props {
  data: CompanyBubbleData[];
  sortedCompanies: string[]; // Ordered by total amount (Small to Large for Y-axis Bottom to Top)
  dateRange: [Date, Date]; // Start and End date for the axis
  type?: 'PURCHASE' | 'PAYMENT'; // Distinguish between Purchase and Payment for labels
  onBubbleClick?: (data: CompanyBubbleData) => void;
}

export const DistributionChart: React.FC<Props> = ({ data, sortedCompanies, dateRange, type = 'PURCHASE', onBubbleClick }) => {

  // Recharts Scatter needs numeric X and Y.
  // X: Time (timestamp)
  // Y: Company Index (mapped from sortedCompanies)
  // Z: Amount (Bubble size)

  const processedData = data.map(d => ({
    ...d,
    x: new Date(d.weekStart).getTime(),
    y: sortedCompanies.indexOf(d.companyName), // Map name to index
    z: d.amount
  }));

  // Custom tooltip for Bubble
  const CustomBubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-scifi-border p-3 rounded text-xs shadow-2xl z-50">
          <div className="font-bold text-scifi-primary mb-1">公司名称：{data.companyName}</div>
          <div className="text-gray-400 mb-1">日期：{data.weekRange}</div>
          <div className="text-gray-400 mb-1">交易笔数：{data.invoiceCount} 笔</div>
          <div className="text-white font-mono">
            {type === 'PAYMENT' ? '支付金额' : '采购金额'}：<span className="text-scifi-accent">{data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full" style={{ height: Math.max(500, sortedCompanies.length * 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="number"
            dataKey="x"
            name="Date"
            domain={[dateRange[0].getTime(), dateRange[1].getTime()]}
            tickFormatter={(unixTime) => new Date(unixTime).toISOString().slice(0, 10)}
            stroke="#94a3b8"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Company"
            ticks={sortedCompanies.map((_, i) => i)}
            tickFormatter={(index) => sortedCompanies[index] || ''}
            stroke="#94a3b8"
            tick={{ fontSize: 11, fill: '#e2e8f0' }}
            width={120}
            interval={0}
            range={[0, sortedCompanies.length - 1]} // Ensure Y axis covers all
          />
          <ZAxis type="number" dataKey="z" range={[50, 1000]} name="Amount" />
          <Tooltip content={<CustomBubbleTooltip />} cursor={{ strokeDasharray: '3 3' }} wrapperStyle={{ zIndex: 1000 }} />
          <Scatter
            name="Purchases"
            data={processedData}
            fill="#06b6d4"
            fillOpacity={0.6}
            stroke="#fff"
            strokeWidth={1}
            onClick={(data) => {
              if (onBubbleClick && data && data.payload) {
                onBubbleClick(data.payload);
              }
            }}
            style={{ cursor: onBubbleClick ? 'pointer' : 'default' }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};