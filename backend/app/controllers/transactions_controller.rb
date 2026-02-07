require 'csv'

class TransactionsController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :set_transaction, only: [:update, :destroy]

  def index
    transactions = filtered_transactions
    paginated = paginate(transactions)

    render json: {
      transactions: paginated[:records],
      pagination: paginated[:meta]
    }
  end

  def create
    transaction = Transaction.new(build_create_params)

    if transaction.save
      render json: transaction, status: :created
    else
      render json: transaction.errors, status: :unprocessable_entity
    end
  end

  def update
    update_params = build_update_params

    if @transaction.update(update_params)
      render json: @transaction
    else
      render json: @transaction.errors, status: :unprocessable_entity
    end
  end

  def destroy
    @transaction.destroy
    head :no_content
  end

  def bulk_upload
    result = BulkUploadHandler.new(params[:file]).process

    if result[:success]
      render json: result[:data], status: :accepted
    else
      render json: { error: result[:error] }, status: result[:status]
    end
  end

  def bulk_categorize
    return render_invalid_ids_error unless valid_ids?

    updated_count = perform_bulk_categorize

    render json: {
      success: true,
      message: "#{updated_count} transaction(s) categorized",
      updated_count: updated_count
    }
  end

  def stats
    render json: TransactionStats.generate
  end

  def detect_anomalies
    results = Transaction.detect_anomalies

    render json: {
      success: true,
      message: "Anomaly detection completed",
      duplicates_flagged: results[:duplicates],
      recurring_flagged: results[:recurring],
      total_flagged: results[:duplicates] + results[:recurring]
    }
  end

  private

  def set_transaction
    @transaction = Transaction.find(params[:id])
  end

  def transaction_params
    params.require(:transaction).permit(
      :date, :description, :amount, :category, :flag,
      :category_manual_override, :flag_manual_override
    )
  end

  def build_create_params
    create_params = transaction_params
    create_params = create_params.merge(category_manual_override: true) if create_params[:category].present?
    create_params
  end

  def build_update_params
    update_params = transaction_params
    update_params = update_params.merge(category_manual_override: true) if update_params[:category].present?
    update_params = update_params.merge(flag_manual_override: true) if update_params[:flag].present?
    update_params
  end

  def filtered_transactions
    transactions = Transaction.order(created_at: :desc)
    transactions = transactions.uncategorized if params[:uncategorized].present?
    transactions = transactions.flagged if params[:flagged].present?
    transactions
  end

  def paginate(scope)
    page = [params[:page].to_i, 1].max
    per_page = [[params[:per_page].to_i, 1].max, 100].min
    per_page = 20 if per_page.zero?

    total_count = scope.count
    total_pages = (total_count.to_f / per_page).ceil

    {
      records: scope.offset((page - 1) * per_page).limit(per_page),
      meta: {
        current_page: page,
        per_page: per_page,
        total_count: total_count,
        total_pages: total_pages
      }
    }
  end

  def valid_ids?
    params[:ids].present? && params[:ids].is_a?(Array)
  end

  def render_invalid_ids_error
    render json: { error: 'No transaction IDs provided' }, status: :unprocessable_entity
  end

  def perform_bulk_categorize
    updates = { category: params[:category], category_manual_override: true }

    if params[:category].present?
      updates[:flag] = 'Reviewed'
      updates[:flag_manual_override] = true
    end

    Transaction.where(id: params[:ids]).update_all(updates)
  end

  class BulkUploadHandler
    REQUIRED_HEADERS = %w[date description amount].freeze

    def initialize(file)
      @file = file
    end

    def process
      return missing_file_error unless file.present?
      return invalid_file_type_error unless valid_file_type?
      return missing_headers_error unless valid_headers?

      create_upload_and_enqueue_job
    rescue CSV::MalformedCSVError => e
      { success: false, error: "Invalid CSV format: #{e.message}", status: :unprocessable_entity }
    rescue StandardError => e
      { success: false, error: "Upload failed: #{e.message}", status: :internal_server_error }
    end

    private

    attr_reader :file

    def missing_file_error
      { success: false, error: 'No file provided', status: :unprocessable_entity }
    end

    def invalid_file_type_error
      { success: false, error: 'Invalid file type. Please upload a CSV file.', status: :unprocessable_entity }
    end

    def missing_headers_error
      { success: false, error: "Missing required columns: #{missing_headers.join(', ')}. Required: date, description, amount", status: :unprocessable_entity }
    end

    def valid_file_type?
      file.content_type == 'text/csv' || file.original_filename.end_with?('.csv')
    end

    def valid_headers?
      missing_headers.empty?
    end

    def missing_headers
      @missing_headers ||= REQUIRED_HEADERS - normalized_headers
    end

    def normalized_headers
      first_row = CSV.read(file.tempfile.path, headers: false, encoding: 'UTF-8').first
      first_row&.map { |h| h.to_s.strip.underscore.downcase } || []
    end

    def total_rows
      @total_rows ||= CSV.read(file.tempfile.path, encoding: 'UTF-8').size - 1
    end

    def create_upload_and_enqueue_job
      csv_upload = CsvUpload.create!(
        filename: file.original_filename,
        total_rows: total_rows,
        status: :processing
      )

      permanent_path = save_file(csv_upload)
      ProcessCsvUploadJob.perform_later(csv_upload.id, permanent_path)

      {
        success: true,
        data: {
          id: csv_upload.id,
          filename: csv_upload.filename,
          total_rows: csv_upload.total_rows,
          status: csv_upload.status
        }
      }
    end

    def save_file(csv_upload)
      upload_dir = Rails.root.join('tmp', 'uploads')
      FileUtils.mkdir_p(upload_dir)
      permanent_path = upload_dir.join("#{csv_upload.id}_#{file.original_filename}")
      FileUtils.cp(file.tempfile.path, permanent_path)
      permanent_path.to_s
    end
  end

  class TransactionStats
    class << self
      def generate
        {
          categories: category_stats,
          flags: flag_stats,
          summary: summary_stats
        }
      end

      private

      def category_stats
        Transaction
          .group(Arel.sql("COALESCE(NULLIF(category, ''), 'Uncategorized')"))
          .select("COALESCE(NULLIF(category, ''), 'Uncategorized') as category, SUM(ABS(amount)) as total_amount, COUNT(*) as count")
          .map { |r| { category: r.category, total_amount: r.total_amount.to_f, count: r.count } }
      end

      def flag_stats
        Transaction
          .group(Arel.sql("COALESCE(NULLIF(flag, ''), 'Valid')"))
          .select("COALESCE(NULLIF(flag, ''), 'Valid') as flag, COUNT(*) as count, SUM(ABS(amount)) as total_amount")
          .map { |r| { flag: r.flag, count: r.count, total_amount: r.total_amount.to_f } }
      end

      def summary_stats
        total_count = Transaction.count
        total_amount = Transaction.sum("ABS(amount)").to_f

        {
          total_count: total_count,
          total_amount: total_amount,
          avg_amount: total_count.positive? ? total_amount / total_count : 0
        }
      end
    end
  end
end
