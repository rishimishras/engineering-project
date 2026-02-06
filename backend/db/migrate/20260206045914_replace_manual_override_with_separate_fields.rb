class ReplaceManualOverrideWithSeparateFields < ActiveRecord::Migration[8.1]
  def change
    remove_column :transactions, :manual_override, :boolean
    add_column :transactions, :category_manual_override, :boolean, default: false, null: false
    add_column :transactions, :flag_manual_override, :boolean, default: false, null: false
  end
end
