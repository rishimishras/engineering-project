class ChangeCategoryNullableInCategoryRules < ActiveRecord::Migration[8.1]
  def change
    change_column_null :category_rules, :category, true
  end
end
