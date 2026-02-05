import { useState, useEffect } from 'react'
import Table, { type Transaction, type PaginationInfo } from '../shared/TransactionTable'
import { columnsWithFlag } from '../shared/TransactionColumns'
import BulkCategoryModal from '../shared/BulkCategoryModal'
import { API_URL } from '../../config'

interface UncategorizedTransactionsProps {
  onCategorized: () => void
  expanded: boolean
  onToggle: () => void
  refreshKey: number
}

export default function UncategorizedTransactions({ onCategorized, expanded, onToggle, refreshKey }: UncategorizedTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false)

  const fetchUncategorized = async (p = page, pp = perPage) => {
    setLoading(true)
    try {
      const response = await fetch(
        `${API_URL}/transactions?uncategorized=true&page=${p}&per_page=${pp}`
      )
      if (!response.ok) throw new Error('Failed to fetch uncategorized transactions')
      const data = await response.json()
      setTransactions(data.transactions)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch uncategorized transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUncategorized(page, perPage)
  }, [page, perPage, refreshKey])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setSelectedIds(new Set())
  }

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage)
    setPage(1)
    setSelectedIds(new Set())
  }

  const handleBulkCategorySuccess = () => {
    setSelectedIds(new Set())
    fetchUncategorized(page, perPage)
    onCategorized()
  }

  if (!pagination || pagination.total_count === 0) return null

  return (
    <>
      <div className="mt-4">
        <div
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <h2 className="text-l font-bold text-black">Uncategorized Transactions</h2>
            <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-500/20 text-red-500">
              {pagination.total_count}
            </span>
          </div>
          {expanded && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsBulkCategoryModalOpen(true) }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
            >
              Categorize ({selectedIds.size})
            </button>
          )}
        </div>
        {expanded && <Table
          data={transactions}
          columns={columnsWithFlag}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          pagination={pagination}
          onPageChange={handlePageChange}
          onPerPageChange={handlePerPageChange}
          loading={loading}
        />}
      </div>

      <BulkCategoryModal
        isOpen={isBulkCategoryModalOpen}
        onClose={() => setIsBulkCategoryModalOpen(false)}
        onSuccess={handleBulkCategorySuccess}
        selectedIds={selectedIds}
      />
    </>
  )
}
