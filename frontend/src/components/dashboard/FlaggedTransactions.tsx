import { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import type { Transaction, PaginationInfo } from '../transactions/TransactionTable'
import Table from '../transactions/TransactionTable'

interface FlaggedTransactionsProps {
  onChanged: () => void
  expanded: boolean
  onToggle: () => void
}

interface EditForm {
  date: string
  description: string
  amount: string
  category: string
  flag: string
}

const FLAG_OPTIONS = ['Valid', 'High Value', 'Review Required', 'Suspicious', 'Urgent', 'Recurring', 'Exception']

export default function FlaggedTransactions({ onChanged, expanded, onToggle }: FlaggedTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [loading, setLoading] = useState(true)

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ date: '', description: '', amount: '', category: '', flag: '' })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  const fetchFlagged = async (p = page, pp = perPage) => {
    setLoading(true)
    try {
      const response = await fetch(
        `http://localhost:3000/transactions?flagged=true&page=${p}&per_page=${pp}`
      )
      if (!response.ok) throw new Error('Failed to fetch flagged transactions')
      const data = await response.json()
      setTransactions(data.transactions)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch flagged transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3000/category_rules/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  useEffect(() => {
    fetchFlagged(page, perPage)
  }, [page, perPage])

  useEffect(() => {
    fetchCategories()
  }, [])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage)
    setPage(1)
  }

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3000/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: { flag: 'Exception' } }),
      })
      if (!response.ok) throw new Error('Failed to approve transaction')
      fetchFlagged(page, perPage)
      onChanged()
    } catch (err) {
      console.error('Failed to approve transaction:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    try {
      const response = await fetch(`http://localhost:3000/transactions/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete transaction')
      fetchFlagged(page, perPage)
      onChanged()
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    }
  }

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      date: transaction.date,
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category || '',
      flag: transaction.flag || 'Valid',
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTransaction) return
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`http://localhost:3000/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: {
            date: editForm.date,
            description: editForm.description,
            amount: parseFloat(editForm.amount),
            category: editForm.category || null,
            flag: editForm.flag || null,
          },
        }),
      })
      if (!response.ok) throw new Error('Failed to update transaction')
      setIsEditModalOpen(false)
      setEditingTransaction(null)
      fetchFlagged(page, perPage)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!pagination || pagination.total_count === 0) return null

  return (
    <>
      <div className="mt-4">
        <div
          className="flex items-center gap-3 mb-4 cursor-pointer"
          onClick={onToggle}
        >
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <h2 className="text-l font-bold text-black">Flagged Transactions</h2>
          <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-500/20 text-red-500">
            {pagination.total_count}
          </span>
        </div>
        {expanded && <Table
          data={transactions}
          columns={[
            { header: 'Date', accessor: 'date' },
            { header: 'Description', accessor: 'description' },
            {
              header: 'Amount',
              accessor: 'amount',
              formatter: (value) => `$${Number(value).toFixed(2)}`,
            },
            { header: 'Category', accessor: 'category' },
            {
              header: 'Flag',
              accessor: 'flag',
              render: (value) => {
                const redFlags = ['Suspicious', 'Urgent', 'Recurring']
                const yellowFlags = ['Review Required', 'High Value']
                if (redFlags.includes(value)) return <span className="text-red-500">{value}</span>
                if (yellowFlags.includes(value)) return <span className="text-yellow-500">{value}</span>
                if (value === 'Exception') return <span className="text-blue-500">{value}</span>
                return value
              },
            },
            {
              header: 'Actions',
              accessor: 'id',
              render: (_value, row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(row.id)}
                    className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => openEditModal(row)}
                    className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={loading}
        />}
      </div>

      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-md w-full rounded-lg bg-white p-8 shadow-xl">
            <DialogTitle className="text-xl font-bold text-gray-900 mb-4">
              Edit Transaction
            </DialogTitle>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="">None</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Flag</label>
                <select
                  value={editForm.flag}
                  onChange={(e) => setEditForm({ ...editForm, flag: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  {FLAG_OPTIONS.map((flag) => (
                    <option key={flag} value={flag}>{flag}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
