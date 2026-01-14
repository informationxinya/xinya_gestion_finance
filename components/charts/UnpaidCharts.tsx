import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from 'recharts';
import { UnpaidSummary } from '../../types';
import { CustomTooltip } from '../ChartTooltip';

// ------------------------------------------------------------------
// 1. Department Summary Chart
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// 1. Department Summary Chart
// ------------------------------------------------------------------
interface DeptProps {
  data: UnpaidSummary;
  onBarClick?: (deptName: string) => void;
}

export const UnpaidDeptChart: React.FC<DeptProps> = ({ data, onBarClick }) => {
  const chartData = useMemo(() => {
    return Object.entries(data.byDepartment)
      .map(([dept, amount]) => ({ dept, amount: amount as number }))
      .sort((a, b) => b.amount - a.amount); // Sort Descending
  }, [data]);

  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="dept"
            stroke="#94a3b8"
            tick={{ fontSize: 12, fontFamily: 'JetBrains Mono', fill: '#94a3b8' }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
          <Bar
            dataKey="amount"
            name="Unpaid Amount"
            radius={[4, 4, 0, 0]}
            onClick={(data) => {
              if (onBarClick && data && data.dept) {
                onBarClick(data.dept);
              }
            }}
            cursor={onBarClick ? "pointer" : "default"}
          >
            {chartData.map((entry, index) => {
              // Varied Palette
              const colors = [
                '#f97316', // Orange
                '#ef4444', // Red
                '#eab308', // Yellow
                '#8b5cf6', // Purple
                '#ec4899', // Pink
                '#06b6d4', // Cyan
                '#10b981', // Emerald
                '#3b82f6', // Blue
                '#6366f1', // Indigo
                '#14b8a6', // Teal
              ];
              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} cursor={onBarClick ? "pointer" : "default"} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


// ------------------------------------------------------------------
// 2. Company Detail Chart
// ------------------------------------------------------------------
interface CompProps {
  data: UnpaidSummary;
  selectedDept: string;
  onBarClick?: (companyName: string) => void;
}

export const UnpaidCompanyChart: React.FC<CompProps> = ({ data, selectedDept, onBarClick }) => {
  const chartData = useMemo(() => {
    const companies = data.byDeptCompany[selectedDept] || {};
    let arr = Object.entries(companies)
      .map(([name, amount]) => ({ name, amount: amount as number }))
      .filter(i => i.amount > 0.01) // Show positive unpaid only
      .sort((a, b) => b.amount - a.amount);

    // Top 20 Logic
    if (arr.length > 20) {
      arr = arr.slice(0, 20);
    }
    return arr;
  }, [data, selectedDept]);

  if (chartData.length === 0) {
    return <div className="h-96 flex items-center justify-center text-gray-500 font-mono">No unpaid bills for this department.</div>
  }

  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis
            type="number"
            stroke="#94a3b8"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(value) => `$${value}`}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={150}
            stroke="#94a3b8"
            tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#e2e8f0' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
          <Bar
            dataKey="amount"
            name="Unpaid Amount"
            radius={[0, 4, 4, 0]}
            onClick={(data) => {
              if (onBarClick && data && data.name) {
                onBarClick(data.name);
              }
            }}
            cursor={onBarClick ? "pointer" : "default"}
          >
            {chartData.map((entry, index) => (
              // Gradient Blue scale for Companies
              <Cell key={`cell-${index}`} fill={`hsl(210, 80%, ${50 + (index * 2)}%)`} cursor={onBarClick ? "pointer" : "default"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};