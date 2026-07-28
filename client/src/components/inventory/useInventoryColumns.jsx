import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '../../utils/cn';

export function useInventoryColumns() {
  return useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Timestamp',
        cell: ({ getValue }) => {
          const date = new Date(getValue());
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-text-title">
                {date.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="text-xs text-text-muted">
                {date.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        },
      },
      {
        accessorFn: (row) => row.product?.name || 'Unknown Product',
        id: 'productName',
        header: 'Product Details',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-bold text-text-title line-clamp-1">
              {row.original.product?.name}
            </span>
            <span className="text-xs font-mono text-text-muted">
              SKU: {row.original.product?.sku || 'N/A'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action / Reason',
        cell: ({ getValue }) => {
          const action = getValue();
          const getBadgeStyle = (act) => {
            switch (act) {
              case 'SALE':
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
              case 'REFUND':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
              case 'OCR_UPDATE':
                return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
              case 'MANUAL_ADJUSTMENT':
              default:
                return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
            }
          };

          return (
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                getBadgeStyle(action)
              )}
            >
              {action ? action.replace('_', ' ') : 'UNKNOWN'}
            </span>
          );
        },
      },
      {
        accessorKey: 'changeAmount',
        header: 'Quantity Change',
        cell: ({ getValue }) => {
          const val = getValue();
          const isPositive = val > 0;

          return (
            <div className="flex items-center justify-end space-x-1 font-mono font-bold">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
              )}
              <span
                className={
                  isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {isPositive ? `+${val}` : val}
              </span>
            </div>
          );
        },
        meta: {
          className: 'text-right',
        },
      },
      {
        accessorKey: 'newQuantity',
        header: 'Stock After Change',
        cell: ({ getValue, row }) => {
          const val = getValue();
          const change = row.original.changeAmount;
          const isPositive = change > 0;

          return (
            <span
              className={cn(
                'inline-flex items-center justify-end px-2.5 py-1 rounded-md text-xs font-mono font-bold border',
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
              )}
            >
              {isPositive ? `+${val}` : val}
            </span>
          );
        },
        meta: {
          className: 'text-right',
        },
      },
    ],
    []
  );
}
