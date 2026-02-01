import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: any) => void;
  onError: (error: string) => void;
  categories: string[];
  onOpenRules: () => void;
}

interface NewTransactionForm {
  date: string;
  description: string;
  amount: string;
  category: string;
}

export default function CreateTransactionModal({ isOpen, onClose, onSuccess, onError, categories, onOpenRules }: CreateTransactionModalProps) {
  const [formData, setFormData] = useState<NewTransactionForm>({
    date: '',
    description: '',
    amount: '',
    category: '',
  });

  const handleCloseModal = () => {
    onClose();
    setFormData({
      date: '',
      description: '',
      amount: '',
      category: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [shouldCloseAfterSave, setShouldCloseAfterSave] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3000/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: {
            date: formData.date,
            description: formData.description,
            amount: parseFloat(formData.amount),
            category: formData.category || null,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const newTransaction = await response.json();
      onSuccess(newTransaction);

      if (shouldCloseAfterSave) {
        handleCloseModal();
      } else {
        // Clear form for next transaction but keep the date
        setFormData({
          date: formData.date,
          description: '',
          amount: '',
          category: '',
        });
        setShouldCloseAfterSave(true); // Reset for next submission
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleCloseModal} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-2xl w-full rounded-lg bg-white p-8 shadow-xl">
          <DialogTitle className="text-xl font-bold text-gray-900 mb-4">
            Create Transaction
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={onOpenRules}
                    className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                  >
                    + New Rule
                  </button>
                </div>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Select a category (optional)</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to auto-categorize based on rules
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-between gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  type="submit"
                  onClick={() => setShouldCloseAfterSave(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-900 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                >
                  Create Another Transaction
                </button>
                <button
                  type="submit"
                  onClick={() => setShouldCloseAfterSave(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
