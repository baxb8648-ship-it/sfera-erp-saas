import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'table-row' | 'kpi' | 'text' | 'circle';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  count = 1,
}) => {
  const renderSkeletonItem = (index: number) => {
    switch (variant) {
      case 'kpi':
        return (
          <div
            key={index}
            className={`bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 space-y-4 animate-pulse ${className}`}
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
            </div>
            <div className="h-8 w-36 bg-gray-200 dark:bg-zinc-800 rounded-lg mt-2" />
            <div className="h-3 w-24 bg-gray-100 dark:bg-zinc-800/60 rounded mt-1" />
          </div>
        );
      case 'card':
        return (
          <div
            key={index}
            className={`bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 space-y-4 animate-pulse ${className}`}
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-1/3 bg-gray-200 dark:bg-zinc-800 rounded" />
              <div className="h-5 w-16 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-3/4 bg-gray-100 dark:bg-zinc-800/70 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-zinc-800/70 rounded" />
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex justify-between items-center">
              <div className="h-6 w-20 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
            </div>
          </div>
        );
      case 'table-row':
        return (
          <div
            key={index}
            className={`flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800/60 animate-pulse ${className}`}
          >
            <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-40 bg-gray-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
            <div className="h-5 w-20 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-zinc-800 rounded" />
          </div>
        );
      case 'circle':
        return (
          <div
            key={index}
            className={`rounded-full bg-gray-200 dark:bg-zinc-800 animate-pulse ${className}`}
          />
        );
      default:
        return (
          <div
            key={index}
            className={`h-4 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse ${className}`}
          />
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => renderSkeletonItem(i))}
    </>
  );
};

export default SkeletonLoader;
