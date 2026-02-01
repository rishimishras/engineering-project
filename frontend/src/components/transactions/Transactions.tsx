import { useState, useEffect } from 'react'
import Table, { type Transaction } from './TransactionTable'
import Layout from '../Layout'
import CreateTransactionModal from './CreateTransactionModal'
import BulkUploadModal from './BulkUploadModal'
import BulkCategoryModal from './BulkCategoryModal'

export default function Example() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:3000/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleTransactionCreated = (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleOpenBulkUploadModal = () => {
    setIsBulkUploadModalOpen(true);
  };

  const handleCloseBulkUploadModal = () => {
    setIsBulkUploadModalOpen(false);
  };

  const handleBulkUploadSuccess = () => {
    fetchTransactions();
  };

  const handleOpenBulkCategoryModal = () => {
    setIsBulkCategoryModalOpen(true);
  };

  const handleCloseBulkCategoryModal = () => {
    setIsBulkCategoryModalOpen(false);
  };

  const handleBulkCategorySuccess = () => {
    fetchTransactions();
    setSelectedIds(new Set());
  };

  return (
    <>
      <Layout currentPage="Transactions">
        <header className="sticky top-15 z-50 bg-white shadow-md">
        {/* <header className="relative bg-white shadow-sm"> */}
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transactions</h1>
          </div>
          <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8 mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              + Create
            </button>
            <button
              type="button"
              onClick={handleOpenBulkUploadModal}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              + Bulk Upload(csv file)
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleOpenBulkCategoryModal}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
              >
                Categorize ({selectedIds.size})
              </button>
            )}
          </div>
        </header>

        <main>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-4">Loading transactions...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-600">Error: {error}</div>
            ) : (
              <Table
                data={transactions}
                columns={[
                  { header: 'Date', accessor: 'date' },
                  { header: 'Description', accessor: 'description' },
                  {
                    header: 'Amount',
                    accessor: 'amount',
                    formatter: (value) => `$${Number(value).toFixed(2)}`
                  },
                  { header: 'Category', accessor: 'category' },
                ]}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            )}
          </div>
        </main>
      </Layout>

      <CreateTransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleTransactionCreated}
        onError={handleError}
      />

      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={handleCloseBulkUploadModal}
        onSuccess={handleBulkUploadSuccess}
      />

      <BulkCategoryModal
        isOpen={isBulkCategoryModalOpen}
        onClose={handleCloseBulkCategoryModal}
        onSuccess={handleBulkCategorySuccess}
        selectedIds={selectedIds}
      />
    </>
  )
}
