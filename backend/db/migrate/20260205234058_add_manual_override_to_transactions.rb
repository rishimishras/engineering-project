class AddManualOverrideToTransactions < ActiveRecord::Migration[8.1]
  def change
    add_column :transactions, :manual_override, :boolean, default: false, null: false
  end
end
