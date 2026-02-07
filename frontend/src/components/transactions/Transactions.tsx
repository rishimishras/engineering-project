import { useState, useEffect } from 'react'
import Table, { type Transaction, type PaginationInfo } from '../shared/TransactionTable'
import { columnsWithCategory, createActionsColumn } from '../shared/TransactionColumns'
import { useTransactionActions } from '../shared/TransactionActions'
import EditTransactionModal from '../shared/EditTransactionModal'
import Header from '../shared/Header'
import CreateTransactionModal from './CreateTransactionModal'
import BulkUploadModal from './BulkUploadModal'
import BulkCategoryModal from '../shared/BulkCategoryModal'
import CategoryRulesButton from '../shared/RulesButton'
import { API_URL } from '../../config'

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
        `${API_URL}/transactions?page=${page}&per_page=${itemsPerPage}`
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
      const response = await fetch(`${API_URL}/category_rules/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleSuccess = () => {
    fetchTransactions(currentPage, perPage);
  };

  const {
    editForm,
    setEditForm,
    isEditModalOpen,
    isSubmitting,
    error: editError,
    handleDelete,
    openEditModal,
    closeEditModal,
    handleEditSubmit,
  } = useTransactionActions({ onSuccess: handleSuccess });

  useEffect(() => {
    fetchTransactions(currentPage, perPage);
    fetchCategories();
  }, [currentPage, perPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set());
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
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
    setCurrentPage(1);
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
                  ...columnsWithCategory,
                  createActionsColumn({
                    onEdit: openEditModal,
                    onDelete: handleDelete,
                  }),
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

      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditSubmit}
        editForm={editForm}
        setEditForm={setEditForm}
        categories={categories}
        isSubmitting={isSubmitting}
        error={editError}
      />
    </>
  )
}
