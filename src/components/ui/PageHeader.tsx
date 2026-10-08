import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BreadcrumbItem } from '../../types/navigation';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div className={twMerge(clsx('pb-6 mb-6 border-b border-nest-border/70', className))}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumbs" className="mb-2">
          <ol className="flex items-center gap-1.5 text-sm text-nest-ink-muted">
            {breadcrumbs.map((item, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-nest-ink-faint" aria-hidden="true" />}
                {item.href ? (
                  <Link
                    to={item.href}
                    className="hover:text-nest-ink hover:underline focus-visible:outline-nest-ink"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-nest-ink font-medium" aria-current="page">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-nest-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-nest-ink-muted mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
