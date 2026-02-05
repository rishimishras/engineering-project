// src/components/Table.tsx
import React from 'react';

// Define the type for transaction data from Rails backend
export interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  flag: string;
  created_at: string;
  updated_at: string;
}

// Pagination info from server
export interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
}

// Define the props for the Table component
interface TableProps {
  data: Transaction[];
  columns: {
    header: string;
    accessor: keyof Transaction;
    formatter?: (value: any) => string;
    render?: (value: any, row: Transaction) => React.ReactNode;
  }[];
  selectable?: boolean;
  selectedIds?: Set<number>;
  onSelectionChange?: (selectedIds: Set<number>) => void;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  loading?: boolean;
}

const Table: React.FC<TableProps> = ({
  data,
  columns,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  pagination,
  onPageChange,
  onPerPageChange,
  loading = false
}) => {
  const allSelected = data.length > 0 && data.every(row => selectedIds.has(row.id));
  const someSelected = data.some(row => selectedIds.has(row.id)) && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(row => row.id)));
    }
  };

  const handleSelectRow = (id: number) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  const renderPagination = () => {
    if (!pagination || !onPageChange || !onPerPageChange) return null;

    const { current_page, per_page, total_count, total_pages } = pagination;
    const startItem = (current_page - 1) * per_page + 1;
    const endItem = Math.min(current_page * per_page, total_count);

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      const maxVisible = 5;

      if (total_pages <= maxVisible) {
        for (let i = 1; i <= total_pages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (current_page > 3) pages.push('...');

        const start = Math.max(2, current_page - 1);
        const end = Math.min(total_pages - 1, current_page + 1);

        for (let i = start; i <= end; i++) pages.push(i);

        if (current_page < total_pages - 2) pages.push('...');
        pages.push(total_pages);
      }
      return pages;
    };

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{total_count.toLocaleString()}</span> results
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="per-page" className="text-sm text-gray-700">Per page:</label>
            <select
              id="per-page"
              value={per_page}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="rounded border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(current_page - 1)}
            disabled={current_page === 1}
            className="relative inline-flex items-center rounded px-2 py-2 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          {getPageNumbers().map((page, idx) => (
            typeof page === 'number' ? (
              <button
                key={idx}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded ${
                  page === current_page
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="px-2 text-gray-500">...</span>
            )
          ))}
          <button
            onClick={() => onPageChange(current_page + 1)}
            disabled={current_page === total_pages}
            className="relative inline-flex items-center rounded px-2 py-2 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
    );
  };

  return (
    <div className="shadow-md sm:rounded-lg flex flex-col">
      <div className="overflow-auto max-h-[70vh]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {selectable && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.accessor}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                No transactions found
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className={`hover:bg-gray-50 ${selectedIds.has(row.id) ? 'bg-gray-50' : ''}`}>
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render
                      ? column.render(row[column.accessor], row)
                      : column.formatter
                      ? column.formatter(row[column.accessor])
                      : row[column.accessor]
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
      {renderPagination()}
    </div>
  );
};

export default Table;
