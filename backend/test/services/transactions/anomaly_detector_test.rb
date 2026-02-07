require "test_helper"

class Transactions::AnomalyDetectorTest < ActiveSupport::TestCase
  setup do
    Transaction.delete_all
    CategoryRule.delete_all
  end

  # detect_all
  test "detect_all returns hash with duplicates and recurring counts" do
    detector = Transactions::AnomalyDetector.new
    result = detector.detect_all

    assert_kind_of Hash, result
    assert_includes result.keys, :duplicates
    assert_includes result.keys, :recurring
  end

  # Duplicate detection
  test "detect_duplicates flags duplicate transactions" do
    # Create duplicate transactions (same date, description, amount)
    Transaction.create!(date: Date.today, description: "Coffee Shop", amount: 5.00)
    Transaction.create!(date: Date.today, description: "Coffee Shop", amount: 5.00)
    Transaction.create!(date: Date.today, description: "Coffee Shop", amount: 5.00)

    detector = Transactions::AnomalyDetector.new
    flagged_count = detector.detect_duplicates

    assert_equal 2, flagged_count
    assert_equal 1, Transaction.where(flag: nil).count
    assert_equal 2, Transaction.where(flag: "Duplicate").count
  end

  test "detect_duplicates keeps first transaction unflagged" do
    first = Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00)
    second = Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00)

    Transactions::AnomalyDetector.new.detect_duplicates

    first.reload
    second.reload

    assert_nil first.flag
    assert_equal "Duplicate", second.flag
  end

  test "detect_duplicates does not flag non-duplicates" do
    Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00)
    Transaction.create!(date: Date.today, description: "Lunch", amount: 15.00)
    Transaction.create!(date: Date.yesterday, description: "Coffee", amount: 5.00)

    detector = Transactions::AnomalyDetector.new
    flagged_count = detector.detect_duplicates

    assert_equal 0, flagged_count
    assert_equal 0, Transaction.where(flag: "Duplicate").count
  end

  test "detect_duplicates does not override Reviewed flag" do
    Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00, flag: "Reviewed")
    Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00)

    Transactions::AnomalyDetector.new.detect_duplicates

    reviewed = Transaction.find_by(flag: "Reviewed")
    assert_not_nil reviewed
  end

  # Recurring detection
  test "detect_recurring flags recurring transactions" do
    # Same description and amount but different dates
    Transaction.create!(date: Date.today, description: "Netflix", amount: 15.99)
    Transaction.create!(date: Date.today - 30.days, description: "Netflix", amount: 15.99)
    Transaction.create!(date: Date.today - 60.days, description: "Netflix", amount: 15.99)

    detector = Transactions::AnomalyDetector.new
    flagged_count = detector.detect_recurring

    assert flagged_count > 0
    assert Transaction.where(flag: "Recurring").exists?
  end

  test "detect_recurring does not flag single occurrences" do
    Transaction.create!(date: Date.today, description: "One-time purchase", amount: 100.00)

    detector = Transactions::AnomalyDetector.new
    flagged_count = detector.detect_recurring

    assert_equal 0, flagged_count
    assert_equal 0, Transaction.where(flag: "Recurring").count
  end

  test "detect_recurring does not override Duplicate flag" do
    # Create a duplicate first
    Transaction.create!(date: Date.today, description: "Netflix", amount: 15.99, flag: "Duplicate")
    Transaction.create!(date: Date.today - 30.days, description: "Netflix", amount: 15.99)

    Transactions::AnomalyDetector.new.detect_recurring

    duplicate = Transaction.find_by(date: Date.today, description: "Netflix")
    assert_equal "Duplicate", duplicate.flag
  end

  # detect_for_transaction (single transaction)
  test "detect_for_transaction flags as duplicate if matching exists" do
    existing = Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00)
    new_txn = Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00)

    Transactions::AnomalyDetector.new.detect_for_transaction(new_txn)

    new_txn.reload
    assert_equal "Duplicate", new_txn.flag
  end

  test "detect_for_transaction flags as recurring if pattern exists" do
    Transaction.create!(date: Date.yesterday, description: "Spotify", amount: 9.99)
    new_txn = Transaction.create!(date: Date.today, description: "Spotify", amount: 9.99)

    Transactions::AnomalyDetector.new.detect_for_transaction(new_txn)

    new_txn.reload
    assert_equal "Recurring", new_txn.flag
  end

  test "detect_for_transaction skips Reviewed transactions" do
    Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00)
    reviewed_txn = Transaction.create!(date: Date.today, description: "Coffee", amount: 5.00, flag: "Reviewed")

    Transactions::AnomalyDetector.new.detect_for_transaction(reviewed_txn)

    reviewed_txn.reload
    assert_equal "Reviewed", reviewed_txn.flag
  end

  # Scoped detection
  test "detect_all respects provided scope" do
    old_txn = Transaction.create!(date: Date.today - 100.days, description: "Old", amount: 100)
    old_dup = Transaction.create!(date: Date.today - 100.days, description: "Old", amount: 100)
    new_txn = Transaction.create!(date: Date.today, description: "New", amount: 50)
    new_dup = Transaction.create!(date: Date.today, description: "New", amount: 50)

    # Only detect in recent transactions
    recent_scope = Transaction.where("date > ?", Date.today - 30.days)
    detector = Transactions::AnomalyDetector.new(recent_scope)
    detector.detect_all

    old_txn.reload
    old_dup.reload
    new_dup.reload

    # Old duplicates should not be flagged
    assert_nil old_txn.flag
    assert_nil old_dup.flag

    # New duplicate should be flagged
    assert_equal "Duplicate", new_dup.flag
  end
end
