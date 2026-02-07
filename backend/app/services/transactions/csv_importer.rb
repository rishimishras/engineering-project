require 'csv'

module Transactions
  class CsvImporter
    BATCH_SIZE = 5000
    MAX_ERRORS = 100

    Result = Struct.new(:processed, :successful, :failed, :errors, keyword_init: true)

    def initialize(csv_upload, file_path)
      @csv_upload = csv_upload
      @file_path = file_path
      @batch = []
      @errors = []
      @processed_count = 0
      @successful_count = 0
      @failed_count = 0
      @batch_start_time = Time.current
    end

    def import
      process_csv_file
      insert_remaining_batch

      Result.new(
        processed: processed_count,
        successful: successful_count,
        failed: failed_count,
        errors: errors
      )
    end

    private

    attr_reader :csv_upload, :file_path, :batch, :errors
    attr_accessor :processed_count, :successful_count, :failed_count, :batch_start_time

    def process_csv_file
      CSV.foreach(file_path, headers: true, encoding: 'UTF-8') do |row|
        process_row(row)
        flush_batch_if_needed
      end
    end

    def process_row(row)
      self.processed_count += 1
      row_number = processed_count + 1

      normalized_row = normalize_row(row)
      validation_result = validate_row(normalized_row, row_number)

      if validation_result[:valid]
        batch << build_transaction_attributes(validation_result[:data])
      else
        self.failed_count += 1
        record_error(row_number, validation_result[:errors], normalized_row)
      end
    end

    def normalize_row(row)
      row.to_h.transform_keys { |key| key.to_s.strip.underscore.downcase }
    end

    def validate_row(normalized_row, row_number)
      data = extract_row_data(normalized_row)
      validation_errors = []

      validation_errors << 'Date is missing' if data[:date_str].blank?
      validation_errors << 'Description is missing' if data[:description].blank?
      validation_errors << 'Amount is missing' if data[:amount_str].blank?

      return { valid: false, errors: validation_errors } if validation_errors.any?

      parsed_data = parse_row_data(data)
      return parsed_data if parsed_data[:valid] == false

      { valid: true, data: parsed_data[:data].merge(category: data[:category]) }
    end

    def extract_row_data(normalized_row)
      {
        date_str: normalized_row['date']&.strip,
        description: normalized_row['description']&.strip,
        amount_str: normalized_row['amount']&.strip,
        category: normalized_row['category']&.strip
      }
    end

    def parse_row_data(data)
      parsed_date = parse_date(data[:date_str])
      return { valid: false, errors: [parsed_date[:error]] } if parsed_date[:error]

      parsed_amount = parse_amount(data[:amount_str])
      return { valid: false, errors: [parsed_amount[:error]] } if parsed_amount[:error]

      {
        valid: true,
        data: {
          date: parsed_date[:value],
          description: data[:description],
          amount: parsed_amount[:value]
        }
      }
    end

    def parse_date(date_str)
      { value: Date.parse(date_str) }
    rescue ArgumentError
      { error: "Invalid date format: '#{date_str}'. Use YYYY-MM-DD" }
    end

    def parse_amount(amount_str)
      cleaned = amount_str.gsub(/[$,]/, '')
      { value: BigDecimal(cleaned) }
    rescue ArgumentError, TypeError
      { error: "Invalid amount format: '#{amount_str}'" }
    end

    def build_transaction_attributes(data)
      {
        date: data[:date],
        description: data[:description],
        amount: data[:amount],
        category: data[:category],
        created_at: Time.current,
        updated_at: Time.current
      }
    end

    def record_error(row_number, error_messages, row_data)
      return if errors.size >= MAX_ERRORS

      errors << {
        row: row_number,
        errors: error_messages,
        data: row_data
      }
    end

    def flush_batch_if_needed
      return unless batch.size >= BATCH_SIZE

      insert_batch
      self.successful_count += batch.size
      batch.clear
      update_progress
    end

    def insert_remaining_batch
      return if batch.empty?

      insert_batch
      self.successful_count += batch.size
      batch.clear
      update_progress
    end

    def insert_batch
      Transaction.insert_all(batch, returning: false)
      apply_rules_to_batch
    end

    def apply_rules_to_batch
      batch_scope = Transaction.where('created_at >= ?', batch_start_time)

      CategoryRules::RuleApplicator.new(batch_scope).apply_all
      AnomalyDetector.new(batch_scope).detect_all

      self.batch_start_time = Time.current
    end

    def update_progress
      csv_upload.update!(
        processed_rows: processed_count,
        successful_rows: successful_count,
        failed_rows: failed_count,
        error_details: errors
      )
    end

  end
end
