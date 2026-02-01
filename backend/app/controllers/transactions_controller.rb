require 'csv'

class TransactionsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:create, :bulk_upload]

  def index
    transactions = Transaction.all.order(created_at: :desc)
    render json: transactions
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

    results = {
      total: 0,
      created: 0,
      duplicates: 0,
      errors: []
    }

    begin
      # Parse CSV
      csv_data = CSV.parse(file.read, headers: true, encoding: 'UTF-8')

      # Validate headers
      required_headers = ['date', 'description', 'amount']
      headers = csv_data.headers&.map(&:downcase) || []
      missing_headers = required_headers - headers

      if missing_headers.any?
        return render json: {
          error: "Missing required columns: #{missing_headers.join(', ')}. Required: date, description, amount"
        }, status: :unprocessable_entity
      end

      # Process each row
      csv_data.each_with_index do |row, index|
        results[:total] += 1
        row_number = index + 2 # +2 because index starts at 0 and we skip header

        # Extract and clean data
        date_str = row['date']&.strip
        description = row['description']&.strip
        amount_str = row['amount']&.strip
        category = row['category']&.strip

        # Validate required fields
        errors = []
        errors << 'Date is missing' if date_str.blank?
        errors << 'Description is missing' if description.blank?
        errors << 'Amount is missing' if amount_str.blank?

        if errors.any?
          results[:errors] << { row: row_number, errors: errors, data: row.to_h }
          next
        end

        # Parse date
        begin
          parsed_date = Date.parse(date_str)
        rescue ArgumentError
          results[:errors] << {
            row: row_number,
            errors: ["Invalid date format: '#{date_str}'. Use YYYY-MM-DD (e.g., 2024-01-15)"],
            data: row.to_h
          }
          next
        end

        # Parse amount (remove currency symbols and commas)
        cleaned_amount = amount_str.gsub(/[$,]/, '')
        begin
          parsed_amount = BigDecimal(cleaned_amount)
        rescue ArgumentError, TypeError
          results[:errors] << {
            row: row_number,
            errors: ["Invalid amount format: '#{amount_str}'. Use numeric values (e.g., 100.50)"],
            data: row.to_h
          }
          next
        end

        # Check for duplicates
        if Transaction.duplicate?(parsed_date, description, parsed_amount)
          results[:duplicates] += 1
          results[:errors] << {
            row: row_number,
            errors: ['Duplicate transaction (same date, description, and amount already exists)'],
            data: row.to_h
          }
          next
        end

        # Create transaction
        transaction = Transaction.new(
          date: parsed_date,
          description: description,
          amount: parsed_amount,
          category: category
        )

        if transaction.save
          results[:created] += 1
        else
          results[:errors] << {
            row: row_number,
            errors: transaction.errors.full_messages,
            data: row.to_h
          }
        end
      end

      render json: {
        success: true,
        message: "Processed #{results[:total]} rows: #{results[:created]} created, #{results[:duplicates]} duplicates, #{results[:errors].length} errors",
        results: results
      }, status: :created

    rescue CSV::MalformedCSVError => e
      render json: { error: "Invalid CSV format: #{e.message}" }, status: :unprocessable_entity
    rescue StandardError => e
      render json: { error: "Upload failed: #{e.message}" }, status: :internal_server_error
    end
  end

  private

  def transaction_params
    params.require(:transaction).permit(:date, :description, :amount, :category)
  end
end