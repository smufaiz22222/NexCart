import { useState, useMemo, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { cn } from '../utils/cn';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';

export default function DataTable({
  columns,
  data,
  isLoading = false,
  // Controlled state inputs (Optional)
  sorting,
  setSorting,
  pagination,
  setPagination,
  globalFilter,
  setGlobalFilter,
  columnVisibility,
  setColumnVisibility,
  rowSelection,
  setRowSelection,
  // Server-side options
  pageCount,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  // UI Customizations
  showVisibilityToggle = true,
  showGlobalFilter = true,
  searchPlaceholder = 'Search records...',
  emptyStateMessage = 'No records found.',
}) {
  // Local state fallbacks if no external state is supplied
  const [localSorting, setLocalSorting] = useState([]);
  const [localPagination, setLocalPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [localGlobalFilter, setLocalGlobalFilter] = useState('');
  const [localColumnVisibility, setLocalColumnVisibility] = useState({});
  const [localRowSelection, setLocalRowSelection] = useState({});
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Derive consolidated table state
  const tableState = useMemo(
    () => ({
      sorting: sorting !== undefined ? sorting : localSorting,
      pagination: pagination !== undefined ? pagination : localPagination,
      globalFilter: globalFilter !== undefined ? globalFilter : localGlobalFilter,
      columnVisibility: columnVisibility !== undefined ? columnVisibility : localColumnVisibility,
      rowSelection: rowSelection !== undefined ? rowSelection : localRowSelection,
    }),
    [
      sorting,
      localSorting,
      pagination,
      localPagination,
      globalFilter,
      localGlobalFilter,
      columnVisibility,
      localColumnVisibility,
      rowSelection,
      localRowSelection,
    ]
  );

  // Wrap state updates to either call props or update local state
  const handleSortingChange = useMemo(
    () => (updater) => {
      const next = typeof updater === 'function' ? updater(tableState.sorting) : updater;
      if (setSorting) setSorting(next);
      else setLocalSorting(next);
    },
    [setSorting, tableState.sorting]
  );

  const handlePaginationChange = useMemo(
    () => (updater) => {
      const next = typeof updater === 'function' ? updater(tableState.pagination) : updater;
      if (setPagination) setPagination(next);
      else setLocalPagination(next);
    },
    [setPagination, tableState.pagination]
  );

  const handleGlobalFilterChange = useMemo(
    () => (updater) => {
      const next = typeof updater === 'function' ? updater(tableState.globalFilter) : updater;
      if (setGlobalFilter) setGlobalFilter(next);
      else setLocalGlobalFilter(next);
    },
    [setGlobalFilter, tableState.globalFilter]
  );

  const handleColumnVisibilityChange = useMemo(
    () => (updater) => {
      const next = typeof updater === 'function' ? updater(tableState.columnVisibility) : updater;
      if (setColumnVisibility) setColumnVisibility(next);
      else setLocalColumnVisibility(next);
    },
    [setColumnVisibility, tableState.columnVisibility]
  );

  const handleRowSelectionChange = useMemo(
    () => (updater) => {
      const next = typeof updater === 'function' ? updater(tableState.rowSelection) : updater;
      if (setRowSelection) setRowSelection(next);
      else setLocalRowSelection(next);
    },
    [setRowSelection, tableState.rowSelection]
  );

  // Initialize TanStack Table instance
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: tableState,
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    pageCount: pageCount,
    manualPagination: manualPagination,
    manualSorting: manualSorting,
    manualFiltering: manualFiltering,
  });

  const selectedRowsCount = Object.keys(tableState.rowSelection).length;
  const totalRowsCount = table.getPrePaginationRowModel().rows.length;

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      {(showGlobalFilter || showVisibilityToggle) && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Global Filter */}
          {showGlobalFilter && (
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={tableState.globalFilter ?? ''}
                onChange={(e) => handleGlobalFilterChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Global search"
                className="block w-full pl-9 pr-4 py-2 bg-[#0a0a0a] border border-zinc-800 rounded-md text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-sans"
              />
            </div>
          )}

          {/* Visibility Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {selectedRowsCount > 0 && (
              <span className="text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-sm">
                {selectedRowsCount} selected
              </span>
            )}

            {showVisibilityToggle && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1c1c1c] border border-zinc-800 text-zinc-300 hover:text-white rounded-md text-xs font-semibold hover:bg-zinc-800 transition-all cursor-pointer"
                  aria-expanded={isColumnDropdownOpen}
                  aria-haspopup="true"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Columns
                </button>

                {isColumnDropdownOpen && (
                  <>
                    {/* Overlay to click off */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsColumnDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-md bg-[#1c1c1c] border border-zinc-800 shadow-xl z-20 py-1 font-sans text-xs">
                      <div className="px-3 py-2 border-b border-zinc-800 font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
                        Toggle Columns
                      </div>
                      <div className="max-h-60 overflow-y-auto py-1">
                        {table
                          .getAllLeafColumns()
                          .filter((col) => col.getCanHide())
                          .map((col) => {
                            const headerVal = col.columnDef.header;
                            // Extract title name if it is a function or node
                            const name =
                              typeof headerVal === 'string'
                                ? headerVal
                                : col.id || col.columnDef.id;

                            return (
                              <label
                                key={col.id}
                                className="flex items-center px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={col.getIsVisible()}
                                  onChange={col.getToggleVisibilityHandler()}
                                  className="mr-2 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/30 accent-amber-500"
                                />
                                <span className="capitalize">{name}</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="relative bg-[#1c1c1c] rounded-lg shadow-xl border border-zinc-800 overflow-hidden">
        {/* Loader Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#1c1c1c]/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2 text-amber-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs font-semibold tracking-wider uppercase">Loading...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-zinc-800"
            role="grid"
            aria-rowcount={totalRowsCount}
          >
            <thead className="bg-[#0a0a0a]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSortable = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();
                    const metaClassName = header.column.columnDef.meta?.className;

                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        scope="col"
                        className={cn(
                          'px-6 py-4 text-xs font-bold text-amber-500/80 uppercase tracking-widest select-none relative',
                          isSortable && 'cursor-pointer hover:text-amber-400 transition-colors',
                          metaClassName || 'text-left'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center gap-1.5',
                              metaClassName?.includes('text-right') && 'justify-end'
                            )}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {isSortable && (
                              <span className="text-zinc-500">
                                {sortDirection === 'asc' ? (
                                  <ChevronUp className="h-3 w-3 text-amber-500" />
                                ) : sortDirection === 'desc' ? (
                                  <ChevronDown className="h-3 w-3 text-amber-500" />
                                ) : (
                                  <ChevronsUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="bg-[#1c1c1c] divide-y divide-zinc-800/50">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-sm text-zinc-500"
                  >
                    {emptyStateMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'hover:bg-zinc-800/20 transition-colors group',
                      row.getIsSelected() && 'bg-amber-500/5 hover:bg-amber-500/10'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const metaClassName = cell.column.columnDef.meta?.className;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-6 py-4 whitespace-nowrap text-sm text-zinc-300',
                            metaClassName
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-zinc-400 font-sans mt-2">
        <div>
          {totalRowsCount > 0 ? (
            <span>
              Showing{' '}
              <span className="font-semibold text-white">
                {tableState.pagination.pageIndex * tableState.pagination.pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-white">
                {Math.min(
                  (tableState.pagination.pageIndex + 1) * tableState.pagination.pageSize,
                  totalRowsCount
                )}
              </span>{' '}
              of <span className="font-semibold text-white">{totalRowsCount}</span> records
            </span>
          ) : (
            <span>No records available</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={tableState.pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="bg-[#0a0a0a] border border-zinc-800 text-zinc-300 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-2 bg-[#1c1c1c] border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-all cursor-pointer"
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2 bg-[#1c1c1c] border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-all cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="px-2 text-zinc-300">
              Page{' '}
              <span className="font-semibold text-white">
                {tableState.pagination.pageIndex + 1}
              </span>{' '}
              of <span className="font-semibold text-white">{table.getPageCount() || 1}</span>
            </span>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2 bg-[#1c1c1c] border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-all cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-2 bg-[#1c1c1c] border border-zinc-800 hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-all cursor-pointer"
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
