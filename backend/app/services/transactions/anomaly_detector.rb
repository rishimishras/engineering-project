module Transactions
  class AnomalyDetector
    PROTECTED_FLAGS = %w[Reviewed].freeze

    def initialize(scope = Transaction.all)
      @scope = scope
    end

    def detect_all
      {
        duplicates: detect_duplicates,
        recurring: detect_recurring
      }
    end

    def detect_duplicates
      duplicate_groups.sum do |group|
        flag_duplicates(group)
      end
    end

    def detect_recurring
      recurring_groups.sum do |group|
        flag_recurring(group)
      end
    end

    def detect_for_transaction(transaction)
      return if transaction.flag == 'Reviewed'

      if duplicate_of_existing?(transaction)
        transaction.update_columns(flag: 'Duplicate', flag_manual_override: true)
      elsif part_of_recurring_pattern?(transaction)
        flag_recurring_pattern(transaction)
      end
    end

    private

    attr_reader :scope

    def duplicate_groups
      scope
        .select('date, description, amount, MIN(id) as first_id')
        .group(:date, :description, :amount)
        .having('COUNT(*) > 1')
    end

    def recurring_groups
      scope
        .select('description, amount')
        .group(:description, :amount)
        .having('COUNT(DISTINCT date) > 1')
    end

    def flag_duplicates(group)
      scope
        .where(date: group.date, description: group.description, amount: group.amount)
        .where.not(id: group.first_id)
        .where('flag IS NULL OR flag NOT IN (?)', PROTECTED_FLAGS)
        .update_all(flag: 'Duplicate', flag_manual_override: true)
    end

    def flag_recurring(group)
      scope
        .where(description: group.description, amount: group.amount)
        .where('flag IS NULL OR flag NOT IN (?)', PROTECTED_FLAGS + ['Duplicate'])
        .update_all(flag: 'Recurring', flag_manual_override: true)
    end

    def duplicate_of_existing?(transaction)
      Transaction
        .where(date: transaction.date, description: transaction.description, amount: transaction.amount)
        .where.not(id: transaction.id)
        .exists?
    end

    def part_of_recurring_pattern?(transaction)
      Transaction
        .where(description: transaction.description, amount: transaction.amount)
        .where.not(date: transaction.date)
        .exists?
    end

    def flag_recurring_pattern(transaction)
      Transaction
        .where(description: transaction.description, amount: transaction.amount)
        .where('flag IS NULL OR flag NOT IN (?)', PROTECTED_FLAGS + ['Duplicate'])
        .update_all(flag: 'Recurring', flag_manual_override: true)
    end
  end
end
