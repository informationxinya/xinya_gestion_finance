import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: string[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs text-scifi-accent font-mono uppercase tracking-wider">{label}</label>}
      <div className="relative group">
        <select
          {...props}
          className={`appearance-none w-full bg-scifi-card border border-scifi-border rounded-md py-2 pl-3 pr-10 text-sm text-scifi-text focus:outline-none focus:border-scifi-primary focus:ring-1 focus:ring-scifi-primary transition-colors cursor-pointer hover:border-scifi-muted ${className}`}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-scifi-muted pointer-events-none group-hover:text-scifi-primary transition-colors" />
      </div>
    </div>
  );
};