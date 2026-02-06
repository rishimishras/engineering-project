import type { Transaction } from '../shared/TransactionTable'

export type Column = {
  header: string
  accessor: keyof Transaction
  formatter?: (value: any) => string
  render?: (value: any, row: Transaction) => React.ReactNode
}

export function renderFlag(value: string): React.ReactNode {
  if (!value) value = 'Valid'
  const redFlags = ['Suspicious', 'Urgent']
  const yellowFlags = ['Review Required', 'High Value', 'Recurring']
  const greenFlags = ['Valid']

  if (redFlags.includes(value)) return <span className="text-red-500">{value}</span>
  if (yellowFlags.includes(value)) return <span className="text-yellow-500">{value}</span>
  if (greenFlags.includes(value)) return <span className="text-green-500">{value}</span>
  if (value === 'Reviewed') return <span className="text-blue-500">{value}</span>
  return value
}

export const dateColumn: Column = { header: 'Date', accessor: 'date' }

export const descriptionColumn: Column = { header: 'Description', accessor: 'description' }

export const amountColumn: Column = {
  header: 'Amount',
  accessor: 'amount',
  formatter: (value) => `$${Number(value).toFixed(2)}`,
}

export const categoryColumn: Column = { header: 'Category', accessor: 'category' }

export const flagColumn: Column = {
  header: 'Flag',
  accessor: 'flag',
  render: renderFlag,
}

export const baseColumns: Column[] = [dateColumn, descriptionColumn, amountColumn]

export const columnsWithCategory: Column[] = [...baseColumns, categoryColumn, flagColumn]

export const columnsWithFlag: Column[] = [...baseColumns, flagColumn]

export interface ActionHandlers {
  onApprove?: (id: number) => void
  onEdit?: (row: Transaction) => void
  onDelete?: (id: number) => void
}

export function createActionsColumn(handlers: ActionHandlers): Column {
  return {
    header: 'Actions',
    accessor: 'id',
    render: (_value, row) => (
      <div className="flex items-center gap-2">
        {handlers.onApprove && (
          <button
            onClick={() => handlers.onApprove!(row.id)}
            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
          >
            Approve
          </button>
        )}
        {handlers.onEdit && (
          <button
            onClick={() => handlers.onEdit!(row)}
            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
          >
            Edit
          </button>
        )}
        {handlers.onDelete && (
          <button
            onClick={() => handlers.onDelete!(row.id)}
            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
          >
            Delete
          </button>
        )}
      </div>
    ),
  }
}
