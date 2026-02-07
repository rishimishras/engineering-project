require "test_helper"

class TransactionTest < ActiveSupport::TestCase
  # Validations
  test "valid transaction with all required fields" do
    transaction = Transaction.new(
      date: Date.today,
      description: "Test transaction",
      amount: 100.00
    )
    assert transaction.valid?
  end

  test "invalid without date" do
    transaction = Transaction.new(description: "Test", amount: 100)
    assert_not transaction.valid?
    assert_includes transaction.errors[:date], "can't be blank"
  end

  test "invalid without description" do
    transaction = Transaction.new(date: Date.today, amount: 100)
    assert_not transaction.valid?
    assert_includes transaction.errors[:description], "can't be blank"
  end

  test "invalid without amount" do
    transaction = Transaction.new(date: Date.today, description: "Test")
    assert_not transaction.valid?
    assert_includes transaction.errors[:amount], "can't be blank"
  end

  test "invalid with non-numeric amount" do
    transaction = Transaction.new(
      date: Date.today,
      description: "Test",
      amount: "not a number"
    )
    assert_not transaction.valid?
    assert_includes transaction.errors[:amount], "is not a number"
  end

  test "valid with negative amount" do
    transaction = Transaction.new(
      date: Date.today,
      description: "Refund",
      amount: -50.00
    )
    assert transaction.valid?
  end

  # Scopes
  test "uncategorized scope returns transactions without category" do
    Transaction.delete_all
    categorized = Transaction.create!(date: Date.today, description: "Cat", amount: 100, category: "Food")
    uncategorized = Transaction.create!(date: Date.today, description: "Uncat", amount: 50, category: nil)
    empty_category = Transaction.create!(date: Date.today, description: "Empty", amount: 25, category: "")

    result = Transaction.uncategorized
    assert_includes result, uncategorized
    assert_includes result, empty_category
    assert_not_includes result, categorized
  end

  test "flagged scope returns flagged transactions excluding Valid and Reviewed" do
    Transaction.delete_all
    flagged = Transaction.create!(date: Date.today, description: "Flagged", amount: 100, flag: "Duplicate")
    valid = Transaction.create!(date: Date.today, description: "Valid", amount: 50, flag: "Valid")
    reviewed = Transaction.create!(date: Date.today, description: "Reviewed", amount: 25, flag: "Reviewed")
    unflagged = Transaction.create!(date: Date.today, description: "None", amount: 75, flag: nil)

    result = Transaction.flagged
    assert_includes result, flagged
    assert_not_includes result, valid
    assert_not_includes result, reviewed
    assert_not_includes result, unflagged
  end

  test "unflagged scope returns transactions without flags" do
    Transaction.delete_all
    flagged = Transaction.create!(date: Date.today, description: "Flagged", amount: 100, flag: "Duplicate")
    unflagged = Transaction.create!(date: Date.today, description: "Unflagged", amount: 50, flag: nil)
    empty_flag = Transaction.create!(date: Date.today, description: "Empty", amount: 25, flag: "")

    result = Transaction.unflagged
    assert_includes result, unflagged
    assert_includes result, empty_flag
    assert_not_includes result, flagged
  end

  # Duplicate detection
  test "duplicate? returns true for existing transaction" do
    Transaction.delete_all
    Transaction.create!(date: Date.today, description: "Duplicate", amount: 100)

    assert Transaction.duplicate?(Date.today, "Duplicate", 100)
  end

  test "duplicate? returns false for unique transaction" do
    Transaction.delete_all
    Transaction.create!(date: Date.today, description: "Original", amount: 100)

    assert_not Transaction.duplicate?(Date.today, "Different", 100)
    assert_not Transaction.duplicate?(Date.yesterday, "Original", 100)
    assert_not Transaction.duplicate?(Date.today, "Original", 200)
  end
end
