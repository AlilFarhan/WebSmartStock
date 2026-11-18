import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'gray', size = 'sm', className = '' }: BadgeProps) {
  const variantClasses = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80',
    blue: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
  }[variant];

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${variantClasses} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
}

export function StockStatusBadge({ currentStock, minStock }: { currentStock: number; minStock: number }) {
  if (currentStock === 0) {
    return <Badge variant="red">Habis (0)</Badge>;
  }
  if (currentStock <= minStock) {
    return <Badge variant="amber">Menipis ({currentStock})</Badge>;
  }
  return <Badge variant="green">Aman ({currentStock})</Badge>;
}
