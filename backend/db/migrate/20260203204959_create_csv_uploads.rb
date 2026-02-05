class CreateCsvUploads < ActiveRecord::Migration[8.1]
  def change
    create_table :csv_uploads do |t|
      t.string :filename
      t.integer :status, default: 0, null: false
      t.integer :total_rows, default: 0
      t.integer :processed_rows, default: 0
      t.integer :successful_rows, default: 0
      t.integer :failed_rows, default: 0
      t.text :error_message
      t.jsonb :error_details, default: []

      t.timestamps
    end

    add_index :csv_uploads, :status
  end
end
