import React from 'react';
import { Badge } from './Badge';

interface ModuleHeaderProps {
  title: string;
  description: string;
  badgeText?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children?: React.ReactNode;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  title,
  description,
  badgeText,
  badgeVariant = 'info',
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        </div>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      {children && <div className="flex items-center gap-2.5 flex-wrap">{children}</div>}
    </div>
  );
};
