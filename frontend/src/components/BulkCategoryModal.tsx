import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

interface BulkCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedIds: Set<number>;
}

export default function BulkCategoryModal({ isOpen, onClose, onSuccess, selectedIds }: BulkCategoryModalProps) {
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCloseModal = () => {
    onClose();
    setCategory('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/transactions/bulk_categorize', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          category: category || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update categories');
      }

      onSuccess();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleCloseModal} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-md w-full rounded-lg bg-white p-8 shadow-xl">
          <DialogTitle className="text-xl font-bold text-gray-900 mb-4">
            Bulk Categorize Transactions
          </DialogTitle>

          <p className="text-sm text-gray-600 mb-4">
            Assign a category to {selectedIds.size} selected transaction{selectedIds.size !== 1 ? 's' : ''}.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="bulk-category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                id="bulk-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Enter category name"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to clear the category from selected transactions.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
              >
                {isSubmitting ? 'Applying...' : 'Apply Category'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
