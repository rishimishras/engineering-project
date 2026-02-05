# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_03_204959) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "category_rules", force: :cascade do |t|
    t.boolean "active", default: true
    t.string "category"
    t.datetime "created_at", null: false
    t.string "field", null: false
    t.string "flag"
    t.string "name", null: false
    t.string "operator", null: false
    t.integer "priority", default: 0
    t.datetime "updated_at", null: false
    t.string "value", null: false
    t.index ["active"], name: "index_category_rules_on_active"
    t.index ["priority"], name: "index_category_rules_on_priority"
  end

  create_table "csv_uploads", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.jsonb "error_details", default: []
    t.text "error_message"
    t.integer "failed_rows", default: 0
    t.string "filename"
    t.integer "processed_rows", default: 0
    t.integer "status", default: 0, null: false
    t.integer "successful_rows", default: 0
    t.integer "total_rows", default: 0
    t.datetime "updated_at", null: false
    t.index ["status"], name: "index_csv_uploads_on_status"
  end

  create_table "transactions", force: :cascade do |t|
    t.decimal "amount"
    t.string "category"
    t.datetime "created_at", null: false
    t.date "date"
    t.string "description"
    t.string "flag"
    t.datetime "updated_at", null: false
  end
end
