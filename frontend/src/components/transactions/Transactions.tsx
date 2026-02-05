import { useState, useEffect } from 'react'
import Table, { type Transaction, type PaginationInfo } from './TransactionTable'
import Header from '../Header'
import CreateTransactionModal from './CreateTransactionModal'
import BulkUploadModal from './BulkUploadModal'
import BulkCategoryModal from './BulkCategoryModal'
import CategoryRulesButton from '../CategoryRulesButton'

export default function Example() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const fetchTransactions = async (page = currentPage, itemsPerPage = perPage) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/transactions?page=${page}&per_page=${itemsPerPage}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
    const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3000/category_rules/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchTransactions(currentPage, perPage);
    fetchCategories();
  }, [currentPage, perPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set()); // Clear selection on page change
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
    setSelectedIds(new Set());
  };

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
    setCurrentPage(1); // Reset to first page to show new transactions
    fetchTransactions(1, perPage);
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
      <Header currentPage="Transactions">
        <header className="sticky top-15 z-50 bg-white shadow-md">
        {/* <header className="relative bg-white shadow-sm"> */}
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Transactions</h1>
          </div>
          <div className="py-6 sm:px-6 lg:px-8 mt-4 flex gap-3 items-center">
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
            <CategoryRulesButton
              className="ml-auto px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 border border-indigo-600 rounded-md hover:bg-indigo-50"
              isOpen={isRulesModalOpen}
              onOpenChange={setIsRulesModalOpen}
              onRulesChange={fetchCategories}
              onTransactionsChange={fetchTransactions}
            />
          </div>
        </header>

        <main>
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {error ? (
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
                  {
                    header: 'Flag',
                    accessor: 'flag',
                    render: (value) => {
                      if (!value) value = 'Valid';
                      const redFlags = ['Suspicious', 'Urgent', 'Recurring'];
                      const yellowFlags = ['Review Required', 'High Value'];
                      const greenFlags = ['Valid']

                      if (redFlags.includes(value)) {
                        return <span className="text-red-500">{value}</span>;
                      } else if (yellowFlags.includes(value)) {
                        return <span className="text-yellow-500">{value}</span>;
                      } else if (greenFlags.includes(value)) {
                        return <span className="text-green-500">{value}</span>;
                      } else if (value === 'Exception') {
                        return <span className="text-blue-500">{value}</span>;
                      }
                      return value;
                    }
                  },
                ]}
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                pagination={pagination || undefined}
                onPageChange={handlePageChange}
                onPerPageChange={handlePerPageChange}
                loading={loading}
              />
            )}
          </div>
        </main>
      </Header>

      <CreateTransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleTransactionCreated}
        onError={handleError}
        categories={categories}
        onOpenRules={() => setIsRulesModalOpen(true)}
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
