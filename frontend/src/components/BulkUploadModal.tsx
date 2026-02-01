import { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResults {
  total: number;
  created: number;
  duplicates: number;
  errors: Array<{
    row: number;
    errors: string[];
    data: Record<string, any>;
  }>;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UploadResults | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3000/transactions/bulk_upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResults(data.results);

      if (data.results.created > 0) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseModal = () => {
    setFile(null);
    setError(null);
    setResults(null);
    setUploading(false);
    onClose();
  };

  const downloadTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,date,description,amount,category\n2024-01-15,Sample Transaction,100.50,Groceries\n2024-01-16,Gas Station,45.00,Transportation';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'transactions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onClose={handleCloseModal} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-2xl w-full rounded-lg bg-white p-8 shadow-xl">
          <DialogTitle className="text-xl font-bold text-gray-900 mb-4">
            Bulk Upload Transactions
          </DialogTitle>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">CSV Format Requirements:</h3>
            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
              <li>Required columns: date, description, amount</li>
              <li>Optional column: category</li>
              <li>Date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
              <li>Amount: numeric value (e.g., 100.50 or $100.50)</li>
            </ul>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Download CSV Template
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {results && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Results</h3>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600">Total Rows:</span>{' '}
                    <span className="font-medium">{results.total}</span>
                  </div>
                  <div>
                    <span className="text-green-600">Created:</span>{' '}
                    <span className="font-medium">{results.created}</span>
                  </div>
                  <div>
                    <span className="text-yellow-600">Duplicates:</span>{' '}
                    <span className="font-medium">{results.duplicates}</span>
                  </div>
                  <div>
                    <span className="text-red-600">Errors:</span>{' '}
                    <span className="font-medium">{results.errors.length}</span>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Errors/Issues (showing first {Math.min(10, results.errors.length)}):
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {results.errors.slice(0, 10).map((errorDetail, idx) => (
                        <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                          <div className="font-semibold text-red-900">Row {errorDetail.row}:</div>
                          <div className="text-red-800">
                            {errorDetail.errors.join(', ')}
                          </div>
                          <div className="text-gray-600 mt-1">
                            Data: {JSON.stringify(errorDetail.data)}
                          </div>
                        </div>
                      ))}
                      {results.errors.length > 10 && (
                        <p className="text-xs text-gray-600 italic">
                          ... and {results.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {results.created > 0 && results.errors.length === 0 && results.duplicates === 0 && (
                  <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-800">
                      ✓ All {results.total} transactions uploaded successfully!
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {results ? 'Close' : 'Cancel'}
              </button>
              {!results && (
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              )}
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
