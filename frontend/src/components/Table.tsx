// src/components/Table.tsx
import React from 'react';

// Define the type for transaction data from Rails backend
interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
  updated_at: string;
}

// Define the props for the Table component
interface TableProps {
  data: Transaction[];
  columns: { header: string; accessor: keyof Transaction; formatter?: (value: any) => string }[];
}

const Table: React.FC<TableProps> = ({ data, columns }) => {
  return (
    <div className="overflow-x-auto shadow-md sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
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
            <tr key={row.id} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {column.formatter
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
