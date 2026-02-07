class ProcessCsvUploadJob < ApplicationJob
  queue_as :default

  def perform(csv_upload_id, file_path)
    csv_upload = CsvUpload.find(csv_upload_id)

    result = Transactions::CsvImporter.new(csv_upload, file_path).import

    csv_upload.update!(
      status: :completed,
      processed_rows: result.processed,
      successful_rows: result.successful,
      failed_rows: result.failed,
      error_details: result.errors
    )
  rescue StandardError => e
    csv_upload&.update!(
      status: :failed,
      error_message: e.message
    )
    raise
  ensure
    File.delete(file_path) if file_path && File.exist?(file_path)
  end
end
