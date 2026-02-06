class Transaction < ApplicationRecord
  validates :date, :description, :amount, presence: true
  validates :amount, numericality: true

  before_validation :apply_category_rules, on: :create
  after_commit :detect_anomalies_for_self, on: :create

  # Check if a transaction with same date, description, and amount already exists
  def self.duplicate?(date, description, amount)
    exists?(date: date, description: description, amount: amount)
  end

  # Detect anomalies in transactions (duplicates and recurring)
  # Returns hash with counts of flagged transactions
  def self.detect_anomalies(scope = Transaction.all)
    duplicates_count = detect_duplicates(scope)
    recurring_count = detect_recurring(scope)

    { duplicates: duplicates_count, recurring: recurring_count }
  end

  # Flag transactions with same Date + Description + Amount as "Duplicate"
  # Keeps the first occurrence (lowest id) unflagged, flags the rest
  def self.detect_duplicates(scope = Transaction.all)
    # Find duplicate groups (same date, description, amount with count > 1)
    duplicate_groups = scope
      .select('date, description, amount, MIN(id) as first_id')
      .group(:date, :description, :amount)
      .having('COUNT(*) > 1')

    total_flagged = 0

    duplicate_groups.each do |group|
      # Flag all duplicates except the first one
      # Skip transactions that are already Reviewed
      # Set flag_manual_override to protect from being cleared by reset_and_reapply
      count = scope
        .where(date: group.date, description: group.description, amount: group.amount)
        .where.not(id: group.first_id)
        .where('flag IS NULL OR flag NOT IN (?)', ['Reviewed'])
        .update_all(flag: 'Duplicate', flag_manual_override: true)

      total_flagged += count
    end

    total_flagged
  end

  # Flag transactions with same Description + Amount (different dates) as "Recurring"
  # Only flags if not already flagged as Duplicate or Reviewed
  def self.detect_recurring(scope = Transaction.all)
    # Find recurring groups (same description, amount with multiple distinct dates)
    recurring_groups = scope
      .select('description, amount')
      .group(:description, :amount)
      .having('COUNT(DISTINCT date) > 1')

    total_flagged = 0

    recurring_groups.each do |group|
      # Flag all transactions in this recurring group
      # Skip transactions already flagged as Reviewed or Duplicate
      # Set flag_manual_override to protect from being cleared by reset_and_reapply
      count = scope
        .where(description: group.description, amount: group.amount)
        .where('flag IS NULL OR flag NOT IN (?)', ['Reviewed', 'Duplicate'])
        .update_all(flag: 'Recurring', flag_manual_override: true)

      total_flagged += count
    end

    total_flagged
  end

  private

  def apply_category_rules
    CategoryRule.apply_rules(self)
  end

  # Efficiently detect anomalies for a newly created transaction
  def detect_anomalies_for_self
    return if flag == 'Reviewed'

    # Check for duplicate: same date, description, amount (excluding self)
    duplicate_exists = Transaction
      .where(date: date, description: description, amount: amount)
      .where.not(id: id)
      .exists?

    if duplicate_exists
      # Flag this transaction as Duplicate with manual override protection
      update_columns(flag: 'Duplicate', flag_manual_override: true)
      return
    end

    # Check for recurring: same description, amount with different dates
    recurring_exists = Transaction
      .where(description: description, amount: amount)
      .where.not(date: date)
      .exists?

    if recurring_exists
      # Flag this and all matching transactions as Recurring with manual override protection
      Transaction
        .where(description: description, amount: amount)
        .where('flag IS NULL OR flag NOT IN (?)', ['Reviewed', 'Duplicate'])
        .update_all(flag: 'Recurring', flag_manual_override: true)
    end
  end
end
