require "test_helper"
require "tempfile"

class Transactions::CsvImporterTest < ActiveSupport::TestCase
  setup do
    Transaction.delete_all
    CategoryRule.delete_all
    @csv_upload = CsvUpload.create!(filename: "test.csv", status: "processing")
  end

  teardown do
    @temp_file&.unlink
  end

  # Helper to create temp CSV file
  def create_csv_file(content)
    @temp_file = Tempfile.new(["test", ".csv"])
    @temp_file.write(content)
    @temp_file.rewind
    @temp_file.path
  end

  # Basic import tests
  test "imports valid CSV with all required fields" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Coffee Shop,5.50
      2024-01-16,Grocery Store,45.00
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 2, result.processed
    assert_equal 2, result.successful
    assert_equal 0, result.failed
    assert_empty result.errors

    assert_equal 2, Transaction.count
    assert Transaction.exists?(description: "Coffee Shop", amount: 5.50)
    assert Transaction.exists?(description: "Grocery Store", amount: 45.00)
  end

  test "imports CSV with optional category field" do
    csv_content = <<~CSV
      date,description,amount,category
      2024-01-15,Netflix,15.99,Entertainment
      2024-01-16,Groceries,100.00,Food
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 2, result.successful

    netflix = Transaction.find_by(description: "Netflix")
    assert_equal "Entertainment", netflix.category
  end

  # Validation tests
  test "rejects rows with missing date" do
    csv_content = <<~CSV
      date,description,amount
      ,Coffee Shop,5.50
      2024-01-16,Grocery Store,45.00
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 2, result.processed
    assert_equal 1, result.successful
    assert_equal 1, result.failed
    assert_equal 1, result.errors.size
    assert_includes result.errors.first[:errors], "Date is missing"
  end

  test "rejects rows with missing description" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,,5.50
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.failed
    assert_includes result.errors.first[:errors], "Description is missing"
  end

  test "rejects rows with missing amount" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Coffee Shop,
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.failed
    assert_includes result.errors.first[:errors], "Amount is missing"
  end

  test "rejects rows with invalid date format" do
    csv_content = <<~CSV
      date,description,amount
      15/01/2024,Coffee Shop,5.50
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.failed
    assert result.errors.first[:errors].any? { |e| e.include?("Invalid date format") }
  end

  test "rejects rows with invalid amount format" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Coffee Shop,not_a_number
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.failed
    assert result.errors.first[:errors].any? { |e| e.include?("Invalid amount format") }
  end

  # Amount parsing tests
  test "parses amounts with currency symbols" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Purchase,$99.99
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.successful
    txn = Transaction.last
    assert_equal BigDecimal("99.99"), txn.amount
  end

  test "parses amounts with commas" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Large Purchase,"1,500.00"
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.successful
    txn = Transaction.last
    assert_equal BigDecimal("1500.00"), txn.amount
  end

  test "parses negative amounts" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Refund,-50.00
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.successful
    txn = Transaction.last
    assert_equal BigDecimal("-50.00"), txn.amount
  end

  # Header normalization tests
  test "handles various header formats" do
    csv_content = <<~CSV
      Date,Description,Amount
      2024-01-15,Coffee Shop,5.50
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.successful
  end

  test "handles headers with extra whitespace" do
    csv_content = <<~CSV
      date , description , amount
      2024-01-15,Coffee Shop,5.50
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 1, result.successful
  end

  # Error limiting tests
  test "limits recorded errors to MAX_ERRORS" do
    rows = (1..150).map { |i| ",Row #{i},10.00" }.join("\n")
    csv_content = "date,description,amount\n#{rows}"

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 150, result.failed
    assert_equal 100, result.errors.size  # MAX_ERRORS = 100
  end

  # Progress tracking tests
  test "updates csv_upload with progress" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Coffee Shop,5.50
      2024-01-16,Grocery Store,45.00
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    importer.import

    @csv_upload.reload
    assert_equal 2, @csv_upload.processed_rows
    assert_equal 2, @csv_upload.successful_rows
    assert_equal 0, @csv_upload.failed_rows
  end

  # Empty file tests
  test "handles empty CSV file" do
    csv_content = "date,description,amount\n"

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 0, result.processed
    assert_equal 0, result.successful
    assert_equal 0, result.failed
  end

  # Mixed valid/invalid rows
  test "processes valid rows even when some are invalid" do
    csv_content = <<~CSV
      date,description,amount
      2024-01-15,Valid Transaction,50.00
      ,Missing Date,25.00
      2024-01-17,Another Valid,75.00
      2024-01-18,,100.00
    CSV

    file_path = create_csv_file(csv_content)
    importer = Transactions::CsvImporter.new(@csv_upload, file_path)
    result = importer.import

    assert_equal 4, result.processed
    assert_equal 2, result.successful
    assert_equal 2, result.failed
    assert_equal 2, Transaction.count
  end
end
