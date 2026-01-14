import React from 'react';
import { TooltipProps } from 'recharts';

export const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-scifi-bg/95 border border-scifi-border p-3 rounded shadow-xl backdrop-blur-md text-xs">
        <p className="font-mono text-scifi-accent mb-2 border-b border-scifi-border pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-mono font-bold text-white">
              {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};