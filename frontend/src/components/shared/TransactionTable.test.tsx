import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Table, { Transaction, PaginationInfo } from './TransactionTable'

const mockTransactions: Transaction[] = [
  {
    id: 1,
    date: '2024-01-15',
    description: 'Coffee Shop',
    amount: 5.50,
    category: 'Food',
    flag: '',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    date: '2024-01-16',
    description: 'Grocery Store',
    amount: 45.00,
    category: 'Food',
    flag: 'Duplicate',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
  },
  {
    id: 3,
    date: '2024-01-17',
    description: 'Gas Station',
    amount: 35.00,
    category: 'Transportation',
    flag: '',
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z',
  },
]

const defaultColumns = [
  { header: 'Date', accessor: 'date' as keyof Transaction },
  { header: 'Description', accessor: 'description' as keyof Transaction },
  { header: 'Amount', accessor: 'amount' as keyof Transaction },
  { header: 'Category', accessor: 'category' as keyof Transaction },
]

describe('TransactionTable', () => {
  // Rendering tests
  it('renders table with column headers', () => {
    render(<Table data={mockTransactions} columns={defaultColumns} />)

    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('renders transaction data in rows', () => {
    render(<Table data={mockTransactions} columns={defaultColumns} />)

    expect(screen.getByText('Coffee Shop')).toBeInTheDocument()
    expect(screen.getByText('Grocery Store')).toBeInTheDocument()
    expect(screen.getByText('Gas Station')).toBeInTheDocument()
  })

  it('shows "No transactions found" when data is empty', () => {
    render(<Table data={[]} columns={defaultColumns} />)

    expect(screen.getByText('No transactions found')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<Table data={[]} columns={defaultColumns} loading={true} />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  // Column formatter tests
  it('applies column formatter to values', () => {
    const columnsWithFormatter = [
      { header: 'Date', accessor: 'date' as keyof Transaction },
      {
        header: 'Amount',
        accessor: 'amount' as keyof Transaction,
        formatter: (value: number) => `$${value.toFixed(2)}`,
      },
    ]

    render(<Table data={mockTransactions} columns={columnsWithFormatter} />)

    expect(screen.getByText('$5.50')).toBeInTheDocument()
    expect(screen.getByText('$45.00')).toBeInTheDocument()
  })

  it('applies custom render function', () => {
    const columnsWithRender = [
      { header: 'Description', accessor: 'description' as keyof Transaction },
      {
        header: 'Amount',
        accessor: 'amount' as keyof Transaction,
        render: (value: number) => <strong data-testid="amount">{value}</strong>,
      },
    ]

    render(<Table data={mockTransactions} columns={columnsWithRender} />)

    const amounts = screen.getAllByTestId('amount')
    expect(amounts).toHaveLength(3)
  })

  // Selection tests
  it('renders checkboxes when selectable is true', () => {
    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        selectable={true}
        selectedIds={new Set()}
        onSelectionChange={() => {}}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBe(4) // 1 header + 3 rows
  })

  it('does not render checkboxes when selectable is false', () => {
    render(<Table data={mockTransactions} columns={defaultColumns} selectable={false} />)

    const checkboxes = screen.queryAllByRole('checkbox')
    expect(checkboxes.length).toBe(0)
  })

  it('calls onSelectionChange when row checkbox is clicked', () => {
    const handleSelectionChange = vi.fn()

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        selectable={true}
        selectedIds={new Set()}
        onSelectionChange={handleSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Click first row checkbox

    expect(handleSelectionChange).toHaveBeenCalledWith(new Set([1]))
  })

  it('calls onSelectionChange to deselect when selected row is clicked', () => {
    const handleSelectionChange = vi.fn()

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        selectable={true}
        selectedIds={new Set([1])}
        onSelectionChange={handleSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Click first row checkbox (already selected)

    expect(handleSelectionChange).toHaveBeenCalledWith(new Set())
  })

  it('selects all rows when header checkbox is clicked', () => {
    const handleSelectionChange = vi.fn()

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        selectable={true}
        selectedIds={new Set()}
        onSelectionChange={handleSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // Click header checkbox

    expect(handleSelectionChange).toHaveBeenCalledWith(new Set([1, 2, 3]))
  })

  it('deselects all rows when header checkbox is clicked and all are selected', () => {
    const handleSelectionChange = vi.fn()

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        selectable={true}
        selectedIds={new Set([1, 2, 3])}
        onSelectionChange={handleSelectionChange}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // Click header checkbox

    expect(handleSelectionChange).toHaveBeenCalledWith(new Set())
  })

  // Pagination tests
  it('renders pagination when pagination prop is provided', () => {
    const pagination: PaginationInfo = {
      current_page: 1,
      per_page: 10,
      total_count: 50,
      total_pages: 5,
    }

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        pagination={pagination}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
      />
    )

    expect(screen.getByText(/Showing/)).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('calls onPageChange when page button is clicked', () => {
    const handlePageChange = vi.fn()
    const pagination: PaginationInfo = {
      current_page: 1,
      per_page: 10,
      total_count: 50,
      total_pages: 5,
    }

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPerPageChange={() => {}}
      />
    )

    const page2Button = screen.getByRole('button', { name: '2' })
    fireEvent.click(page2Button)

    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('disables previous button on first page', () => {
    const pagination: PaginationInfo = {
      current_page: 1,
      per_page: 10,
      total_count: 50,
      total_pages: 5,
    }

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        pagination={pagination}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
      />
    )

    const prevButton = screen.getByRole('button', { name: 'Previous' })
    expect(prevButton).toBeDisabled()
  })

  it('disables next button on last page', () => {
    const pagination: PaginationInfo = {
      current_page: 5,
      per_page: 10,
      total_count: 50,
      total_pages: 5,
    }

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        pagination={pagination}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
      />
    )

    const nextButton = screen.getByRole('button', { name: 'Next' })
    expect(nextButton).toBeDisabled()
  })

  it('calls onPerPageChange when per page dropdown changes', () => {
    const handlePerPageChange = vi.fn()
    const pagination: PaginationInfo = {
      current_page: 1,
      per_page: 10,
      total_count: 50,
      total_pages: 5,
    }

    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        pagination={pagination}
        onPageChange={() => {}}
        onPerPageChange={handlePerPageChange}
      />
    )

    const select = screen.getByLabelText('Per page:')
    fireEvent.change(select, { target: { value: '20' } })

    expect(handlePerPageChange).toHaveBeenCalledWith(20)
  })

  // Row highlighting tests
  it('highlights selected rows', () => {
    render(
      <Table
        data={mockTransactions}
        columns={defaultColumns}
        selectable={true}
        selectedIds={new Set([1])}
        onSelectionChange={() => {}}
      />
    )

    const rows = screen.getAllByRole('row')
    // First row after header should have bg-gray-50 class
    expect(rows[1]).toHaveClass('bg-gray-50')
  })
})
