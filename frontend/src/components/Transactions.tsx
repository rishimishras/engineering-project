import { useState, useEffect } from 'react'
import Table from './Table'
import Layout from './Layout'
import CreateTransactionModal from './CreateTransactionModal'

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export default function Example() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
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

  return (
    <>
      <Layout currentPage="Transactions">
        <header className="relative bg-white shadow-sm">
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
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              + Create Bulk Upload file
            </button>
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
    </>
  )
}
