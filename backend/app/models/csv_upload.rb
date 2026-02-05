class CsvUpload < ApplicationRecord
  enum :status, { pending: 0, processing: 1, completed: 2, failed: 3 }

  def progress_percentage
    return 0 if total_rows.zero?
    ((processed_rows.to_f / total_rows) * 100).round(2)
  end
end
