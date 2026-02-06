require 'csv'

class TransactionsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:create, :update, :destroy, :bulk_upload, :bulk_categorize, :detect_anomalies]

  def index
    page = (params[:page] || 1).to_i
    per_page = (params[:per_page] || 20).to_i
    per_page = [per_page, 100].min # Cap at 100 to prevent abuse

    transactions = Transaction.order(created_at: :desc)
    if params[:uncategorized].present?
      transactions = transactions.where('category IS NULL OR category = ?', '')
    end
    if params[:flagged].present?
      transactions = transactions.where.not(flag: [nil, '', 'Valid', 'Reviewed'])
    end
    total_count = transactions.count
    total_pages = (total_count.to_f / per_page).ceil

    paginated_transactions = transactions.offset((page - 1) * per_page).limit(per_page)

    render json: {
      transactions: paginated_transactions,
      pagination: {
        current_page: page,
        per_page: per_page,
        total_count: total_count,
        total_pages: total_pages
      }
    }
  end

  def create
    transaction = Transaction.new(transaction_params)
    if transaction.save
      render json: transaction, status: :created
    else
      render json: transaction.errors, status: :unprocessable_entity
    end
  end

  def bulk_upload
    unless params[:file].present?
      return render json: { error: 'No file provided' }, status: :unprocessable_entity
    end

    file = params[:file]

    # Validate file type
    unless file.content_type == 'text/csv' || file.original_filename.end_with?('.csv')
      return render json: { error: 'Invalid file type. Please upload a CSV file.' }, status: :unprocessable_entity
    end

    begin
      # Read first row to validate headers
      first_row = CSV.read(file.tempfile.path, headers: false, encoding: 'UTF-8').first
      required_headers = ['date', 'description', 'amount']
      headers = first_row&.map { |h| h.to_s.strip.underscore.downcase } || []
      missing_headers = required_headers - headers

      if missing_headers.any?
        return render json: {
          error: "Missing required columns: #{missing_headers.join(', ')}. Required: date, description, amount"
        }, status: :unprocessable_entity
      end

      # Count total rows (excluding header)
      total_rows = CSV.read(file.tempfile.path, encoding: 'UTF-8').size - 1

      # Create CsvUpload record
      csv_upload = CsvUpload.create!(
        filename: file.original_filename,
        total_rows: total_rows,
        status: :pending
      )

      # Save file to permanent location
      upload_dir = Rails.root.join('tmp', 'uploads')
      FileUtils.mkdir_p(upload_dir) unless Dir.exist?(upload_dir)
      permanent_path = upload_dir.join("#{csv_upload.id}_#{file.original_filename}")
      FileUtils.cp(file.tempfile.path, permanent_path)

      # Enqueue background job
      ProcessCsvUploadJob.perform_later(csv_upload.id, permanent_path.to_s)

      render json: {
        id: csv_upload.id,
        filename: csv_upload.filename,
        total_rows: csv_upload.total_rows,
        status: csv_upload.status
      }, status: :accepted

    rescue CSV::MalformedCSVError => e
      render json: { error: "Invalid CSV format: #{e.message}" }, status: :unprocessable_entity
    rescue StandardError => e
      render json: { error: "Upload failed: #{e.message}" }, status: :internal_server_error
    end
  end

  def stats
    # Aggregate by category (sum of absolute amounts)
    category_stats = Transaction
      .group(Arel.sql("COALESCE(NULLIF(category, ''), 'Uncategorized')"))
      .select("COALESCE(NULLIF(category, ''), 'Uncategorized') as category, SUM(ABS(amount)) as total_amount, COUNT(*) as count")
      .map { |r| { category: r.category, total_amount: r.total_amount.to_f, count: r.count } }

    # Aggregate by flag (count + amount) — NULL/empty flags default to 'Valid'
    flag_stats = Transaction
      .group(Arel.sql("COALESCE(NULLIF(flag, ''), 'Valid')"))
      .select("COALESCE(NULLIF(flag, ''), 'Valid') as flag, COUNT(*) as count, SUM(ABS(amount)) as total_amount")
      .map { |r| { flag: r.flag, count: r.count, total_amount: r.total_amount.to_f } }

    # Summary stats
    total_count = Transaction.count
    total_amount = Transaction.sum("ABS(amount)").to_f
    avg_amount = total_count > 0 ? total_amount / total_count : 0

    render json: {
      categories: category_stats,
      flags: flag_stats,
      summary: {
        total_count: total_count,
        total_amount: total_amount,
        avg_amount: avg_amount
      }
    }
  end

  def update
    transaction = Transaction.find(params[:id])
    update_params = transaction_params

    # Set manual override flags based on what user is updating
    update_params = update_params.merge(category_manual_override: true) if update_params[:category].present?
    update_params = update_params.merge(flag_manual_override: true) if update_params[:flag].present?

    if transaction.update(update_params)
      render json: transaction
    else
      render json: transaction.errors, status: :unprocessable_entity
    end
  end

  def destroy
    transaction = Transaction.find(params[:id])
    transaction.destroy
    head :no_content
  end

  def bulk_categorize
    ids = params[:ids]
    category = params[:category]

    unless ids.present? && ids.is_a?(Array)
      return render json: { error: 'No transaction IDs provided' }, status: :unprocessable_entity
    end

    updates = { category: category, category_manual_override: true }
    if category.present?
      updates[:flag] = 'Reviewed'
      updates[:flag_manual_override] = true
    end
    updated_count = Transaction.where(id: ids).update_all(updates)

    render json: {
      success: true,
      message: "#{updated_count} transaction(s) categorized",
      updated_count: updated_count
    }, status: :ok
  end

  def detect_anomalies
    results = Transaction.detect_anomalies

    render json: {
      success: true,
      message: "Anomaly detection completed",
      duplicates_flagged: results[:duplicates],
      recurring_flagged: results[:recurring],
      total_flagged: results[:duplicates] + results[:recurring]
    }, status: :ok
  end

  private

  def transaction_params
    params.require(:transaction).permit(:date, :description, :amount, :category, :flag, :category_manual_override, :flag_manual_override)
  end
end