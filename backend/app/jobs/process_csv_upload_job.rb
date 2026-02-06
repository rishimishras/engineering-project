class ProcessCsvUploadJob < ApplicationJob
  queue_as :default

  BATCH_SIZE = 5000
  PROGRESS_UPDATE_INTERVAL = 10000

  def perform(csv_upload_id, file_path)
    csv_upload = CsvUpload.find(csv_upload_id)
    csv_upload.update!(status: :processing)

    # Track start time to identify newly uploaded transactions
    upload_start_time = Time.current

    batch = []
    errors = []
    processed_count = 0
    successful_count = 0
    failed_count = 0

    begin
      CSV.foreach(file_path, headers: true, encoding: 'UTF-8') do |row|
        processed_count += 1
        row_number = processed_count + 1 # +1 for header

        # Normalize column names
        normalized_row = row.to_h.transform_keys do |key|
          key.to_s.strip.underscore.downcase
        end

        # Extract and validate data
        date_str = normalized_row['date']&.strip
        description = normalized_row['description']&.strip
        amount_str = normalized_row['amount']&.strip
        category = normalized_row['category']&.strip

        # Validate required fields
        validation_errors = []
        validation_errors << 'Date is missing' if date_str.blank?
        validation_errors << 'Description is missing' if description.blank?
        validation_errors << 'Amount is missing' if amount_str.blank?

        if validation_errors.any?
          failed_count += 1
          errors << { row: row_number, errors: validation_errors, data: normalized_row } if errors.size < 100
          next
        end

        # Parse date
        begin
          parsed_date = Date.parse(date_str)
        rescue ArgumentError
          failed_count += 1
          errors << {
            row: row_number,
            errors: ["Invalid date format: '#{date_str}'. Use YYYY-MM-DD"],
            data: normalized_row
          } if errors.size < 100
          next
        end

        # Parse amount
        cleaned_amount = amount_str.gsub(/[$,]/, '')
        begin
          parsed_amount = BigDecimal(cleaned_amount)
        rescue ArgumentError, TypeError
          failed_count += 1
          errors << {
            row: row_number,
            errors: ["Invalid amount format: '#{amount_str}'"],
            data: normalized_row
          } if errors.size < 100
          next
        end

        # Add to batch (skip duplicate detection as requested)
        batch << {
          date: parsed_date,
          description: description,
          amount: parsed_amount,
          category: category,
          created_at: Time.current,
          updated_at: Time.current
        }

        # Batch insert when batch size reached
        if batch.size >= BATCH_SIZE
          insert_batch(batch)
          successful_count += batch.size
          batch.clear
        end

        # Update progress periodically
        if processed_count % PROGRESS_UPDATE_INTERVAL == 0
          csv_upload.update!(
            processed_rows: processed_count,
            successful_rows: successful_count,
            failed_rows: failed_count,
            error_details: errors
          )
        end
      end

      # Insert remaining batch
      if batch.any?
        insert_batch(batch)
        successful_count += batch.size
        batch.clear
      end

      # Apply category rules to newly uploaded transactions (using optimized batch method)
      newly_uploaded = Transaction.where('created_at >= ?', upload_start_time)
      CategoryRule.apply_rules_batch(newly_uploaded)

      # Detect anomalies (duplicates and recurring transactions)
      Transaction.detect_anomalies(newly_uploaded)

      # Mark as completed
      csv_upload.update!(
        status: :completed,
        processed_rows: processed_count,
        successful_rows: successful_count,
        failed_rows: failed_count,
        error_details: errors
      )

    rescue StandardError => e
      csv_upload.update!(
        status: :failed,
        error_message: e.message,
        processed_rows: processed_count,
        successful_rows: successful_count,
        failed_rows: failed_count,
        error_details: errors
      )
      raise # Re-raise for job retry
    ensure
      # Clean up temporary file
      File.delete(file_path) if File.exist?(file_path)
    end
  end

  private

  def insert_batch(batch)
    # Insert without callbacks (skip category rules for speed)
    Transaction.insert_all(batch, returning: false)
  end
end
