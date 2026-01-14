import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", title }) => {
  return (
    <div className={`glass-panel rounded-xl p-6 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-scifi-accent via-scifi-primary to-transparent opacity-50" />
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
           <span className="w-1.5 h-1.5 bg-scifi-accent rounded-full animate-pulse" />
           {title}
        </h3>
      )}
      {children}
    </div>
  );
};