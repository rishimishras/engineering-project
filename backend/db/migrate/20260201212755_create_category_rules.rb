class CreateCategoryRules < ActiveRecord::Migration[8.1]
  def change
    create_table :category_rules do |t|
      t.string :name, null: false
      t.string :field, null: false
      t.string :operator, null: false
      t.string :value, null: false
      t.string :category, null: false
      t.integer :priority, default: 0
      t.boolean :active, default: true

      t.timestamps
    end

    add_index :category_rules, :priority
    add_index :category_rules, :active
  end
end
