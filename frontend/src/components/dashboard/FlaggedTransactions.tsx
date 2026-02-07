import { useState, useEffect } from 'react'
import type { Transaction, PaginationInfo } from '../shared/TransactionTable'
import Table from '../shared/TransactionTable'
import { columnsWithCategory, createActionsColumn } from '../shared/TransactionColumns'
import { useTransactionActions } from '../shared/TransactionActions'
import EditTransactionModal from '../shared/EditTransactionModal'
import { API_URL } from '../../config'

interface FlaggedTransactionsProps {
  onChanged: () => void
  expanded: boolean
  onToggle: () => void
  refreshKey: number
}

export default function FlaggedTransactions({ onChanged, expanded, onToggle, refreshKey }: FlaggedTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>([])

  const fetchFlagged = async (p = page, pp = perPage) => {
    setLoading(true)
    try {
      const response = await fetch(
        `${API_URL}/transactions?flagged=true&page=${p}&per_page=${pp}`
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
      const response = await fetch(`${API_URL}/category_rules/categories`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const handleSuccess = () => {
    fetchFlagged(page, perPage)
    onChanged()
  }

  const {
    editForm,
    setEditForm,
    isEditModalOpen,
    isSubmitting,
    error,
    handleApprove,
    handleDelete,
    openEditModal,
    closeEditModal,
    handleEditSubmit,
  } = useTransactionActions({ onSuccess: handleSuccess })

  useEffect(() => {
    fetchFlagged(page, perPage)
  }, [page, perPage, refreshKey])

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
            ...columnsWithCategory,
            createActionsColumn({
              onApprove: handleApprove,
              onEdit: openEditModal,
              onDelete: handleDelete,
            }),
          ]}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={loading}
        />}
      </div>

      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
        editForm={editForm}
        setEditForm={setEditForm}
        categories={categories}
        isSubmitting={isSubmitting}
        error={error}
      />
    </>
  )
}
