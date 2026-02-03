class AddFlagToTransactionsAndCategoryRules < ActiveRecord::Migration[8.1]
  def change
    add_column :transactions, :flag, :string
    add_column :category_rules, :flag, :string
  end
end
