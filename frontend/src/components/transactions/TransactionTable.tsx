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
}

const Table: React.FC<TableProps> = ({ data, columns, selectable = false, selectedIds = new Set(), onSelectionChange }) => {
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

  return (
    <div className="overflow-x-auto shadow-md sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
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
          {data.map((row) => (
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
