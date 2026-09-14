import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';

export const DataTable = ({
  columns = [],
  data = [],
  isLoading = false,
  keyField = '_id',
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
  pagination,
  onPageChange,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no items to display.',
  onRowClick,
  bulkActions,
}) => {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

  if (isLoading) {
    return <TableSkeleton rows={8} cols={columns.length + (selectable ? 1 : 0)} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Bulk Action Bar (when rows are selected) */}
      {selectable && selectedIds.length > 0 && (
        <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900 animate-in fade-in duration-150">
          <div className="font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'} selected
          </div>
          {bulkActions && <div className="flex items-center gap-2">{bulkActions}</div>}
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {selectable && (
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => el && (el.indeterminate = isIndeterminate)}
                    onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key || col.title}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                  className={`px-4 py-3.5 whitespace-nowrap select-none ${
                    col.sortable ? 'cursor-pointer hover:text-slate-900' : ''
                  } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={{ width: col.width }}
                >
                  <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    <span>{col.title}</span>
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortBy === col.key ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {data.map((row, idx) => {
              const id = row[keyField] || idx;
              const isSelected = selectedIds.includes(id);

              return (
                <tr
                  key={id}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
                  } ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {selectable && (
                    <td
                      className="px-4 py-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectRow && onSelectRow(id, e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key || col.title}
                      className={`px-4 py-3.5 whitespace-nowrap ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key] || '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{pagination.total}</span> records
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-1 font-semibold text-slate-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
