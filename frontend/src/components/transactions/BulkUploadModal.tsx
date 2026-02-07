import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { API_URL } from '../../config'

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadProgress {
  id: number;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows?: number;
  processed_rows?: number;
  successful_rows?: number;
  failed_rows?: number;
  progress?: number;
  error_message?: string;
  error_details?: Array<{
    row: number;
    errors: string[];
    data: Record<string, any>;
  }>;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSuccessfulRows = useRef<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setUploadProgress(null);
    }
  };

  const pollProgress = async (uploadId: number) => {
    try {
      const response = await fetch(`${API_URL}/csv_uploads/${uploadId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }
      const data: UploadProgress = await response.json();
      setUploadProgress(data);

      // Refresh transactions when new rows are successfully inserted
      const currentSuccessful = data.successful_rows ?? 0;
      if (currentSuccessful > lastSuccessfulRows.current) {
        lastSuccessfulRows.current = currentSuccessful;
        onSuccess();
      }

      // Stop polling if completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
        lastSuccessfulRows.current = 0;
      }
    } catch (err) {
      console.error('Error polling progress:', err);
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
    setUploadProgress(null);
    lastSuccessfulRows.current = 0;

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload file
      const data = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();


        xhr.onload = () => {
          try {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'Upload failed'));
            }
          } catch {
            reject(new Error('Invalid server response'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));

        xhr.open('POST', `${API_URL}/transactions/bulk_upload`);
        xhr.send(formData);
      });

      // Start polling for progress
      setUploadProgress(data);
      setUploading(false);
      pollingInterval.current = setInterval(() => pollProgress(data.id), 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setUploading(false);
    }
  };

  const handleCloseModal = () => {
    const isActiveUpload = uploading || (uploadProgress && (uploadProgress.status === 'pending' || uploadProgress.status === 'processing'));

    // If upload is in progress, just close the modal but keep state and polling
    if (isActiveUpload) {
      onClose();
      return;
    }

    // Upload completed or failed - clean up
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    // Refresh transactions if an upload was started
    if (uploadProgress) {
      onSuccess();
    }

    setFile(null);
    setError(null);
    setUploadProgress(null);
    setUploading(false);
    lastSuccessfulRows.current = 0;
    onClose();
  };

  // Resume polling when modal reopens with an active upload
  useEffect(() => {
    if (isOpen && uploadProgress && !pollingInterval.current) {
      const isActiveUpload = uploadProgress.status === 'pending' || uploadProgress.status === 'processing';
      if (isActiveUpload) {
        pollingInterval.current = setInterval(() => pollProgress(uploadProgress.id), 1000);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

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

  const isProcessing = uploadProgress?.status === 'pending' || uploadProgress?.status === 'processing';
  const isCompleted = uploadProgress?.status === 'completed';
  const isFailed = uploadProgress?.status === 'failed';

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
                disabled={uploading || isProcessing}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Progress Section - shows immediately when upload starts */}
            {(uploading || uploadProgress) && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  {!uploadProgress && 'Uploading file...'}
                  {isProcessing && 'Processing...'}
                  {isCompleted && 'Upload Complete'}
                  {isFailed && 'Upload Failed'}
                </h3>

                {/* Progress bar - shows for uploading and processing */}
                {(uploading || isProcessing) && (
                  <div className="mb-4">
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-3 bg-gray-900 transition-all duration-500"
                        style={{ width: `${uploadProgress?.progress ?? 0}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {!uploadProgress && 'Starting...'}
                      {uploadProgress && isProcessing && `${(uploadProgress.progress ?? 0).toFixed(1)}% - Processed ${(uploadProgress.processed_rows ?? 0).toLocaleString()} of ${(uploadProgress.total_rows ?? 0).toLocaleString()} rows`}
                    </p>
                  </div>
                )}

                {uploadProgress && (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-600">Total Rows:</span>{' '}
                        <span className="font-medium">{(uploadProgress.total_rows ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Processed:</span>{' '}
                        <span className="font-medium">{(uploadProgress.processed_rows ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-green-600">Successful:</span>{' '}
                        <span className="font-medium">{(uploadProgress.successful_rows ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-red-600">Failed:</span>{' '}
                        <span className="font-medium">{(uploadProgress.failed_rows ?? 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {isFailed && uploadProgress.error_message && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">{uploadProgress.error_message}</p>
                      </div>
                    )}

                    {uploadProgress.error_details && uploadProgress.error_details.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Validation Errors (showing first {Math.min(10, uploadProgress.error_details.length)}):
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {uploadProgress.error_details.slice(0, 10).map((errorDetail, idx) => (
                            <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                              <div className="font-semibold text-red-900">Row {errorDetail.row}:</div>
                              <div className="text-red-800">
                                {errorDetail.errors.join(', ')}
                              </div>
                            </div>
                          ))}
                          {uploadProgress.error_details.length > 10 && (
                            <p className="text-xs text-gray-600 italic">
                              ... and {uploadProgress.error_details.length - 10} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {isCompleted && (uploadProgress.failed_rows ?? 0) === 0 && (
                      <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-sm text-green-800">
                          ✓ All {(uploadProgress.successful_rows ?? 0).toLocaleString()} transactions uploaded successfully!
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3">
              {/* Hide close button during processing - user can click outside to close */}
              {!isProcessing && !uploading && (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isCompleted || isFailed ? 'Close' : 'Cancel'}
                </button>
              )}
              {!uploadProgress && !uploading && (
                <button
                  type="submit"
                  disabled={!file}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
              )}
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
