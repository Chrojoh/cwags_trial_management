'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  // Always include Dashboard as the first item if not already present
  const breadcrumbItems = items[0]?.label !== 'Dashboard' 
    ? [{ label: 'Dashboard', href: '/dashboard' }, ...items]
    : items;

  return (
    <nav className={cn('flex items-center space-x-2 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
              )}

              {/* Breadcrumb Item */}
              {isLast ? (
                // Current page - not clickable
                <span className="flex items-center text-gray-900 font-medium">
                  {isFirst && <Home className="h-4 w-4 mr-1" />}
                  {item.label}
                </span>
              ) : (
                // Clickable breadcrumb
                <Link
                  href={item.href || '#'}
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {isFirst && <Home className="h-4 w-4 mr-1" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};