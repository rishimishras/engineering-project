class CsvUploadsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:show]

  def show
    csv_upload = CsvUpload.find(params[:id])

    render json: {
      id: csv_upload.id,
      filename: csv_upload.filename,
      status: csv_upload.status,
      total_rows: csv_upload.total_rows,
      processed_rows: csv_upload.processed_rows,
      successful_rows: csv_upload.successful_rows,
      failed_rows: csv_upload.failed_rows,
      progress: csv_upload.progress_percentage,
      error_message: csv_upload.error_message,
      error_details: csv_upload.error_details
    }
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Upload not found' }, status: :not_found
  end
end
