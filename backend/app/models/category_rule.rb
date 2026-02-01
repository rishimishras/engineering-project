class CategoryRule < ApplicationRecord
  FIELDS = %w[description amount].freeze
  OPERATORS = %w[contains equals greater_than less_than].freeze

  validates :name, :field, :operator, :value, :category, presence: true
  validates :field, inclusion: { in: FIELDS }
  validates :operator, inclusion: { in: OPERATORS }

  scope :active, -> { where(active: true) }
  scope :by_priority, -> { order(priority: :desc) }

  def matches?(transaction)
    case field
    when 'description'
      match_description(transaction.description)
    when 'amount'
      match_amount(transaction.amount)
    else
      false
    end
  end

  def self.apply_rules(transaction)
    # Skip if category is already explicitly set (not nil or blank)
    return if transaction.category.present?

    matching_rule = active.by_priority.find { |rule| rule.matches?(transaction) }
    transaction.category = matching_rule.category if matching_rule
  end

  # Apply rules to all uncategorized transactions
  def self.apply_to_uncategorized
    uncategorized = Transaction.where(category: [nil, ''])
    updated_count = 0

    uncategorized.find_each do |transaction|
      matching_rule = active.by_priority.find { |rule| rule.matches?(transaction) }
      if matching_rule
        transaction.update_column(:category, matching_rule.category)
        updated_count += 1
      end
    end

    updated_count
  end

  private

  def match_description(description)
    return false unless description.present?

    desc_lower = description.downcase

    case operator
    when 'contains'
      # Support comma-separated values for contains
      keywords = value.split(',').map(&:strip).map(&:downcase)
      keywords.any? { |keyword| desc_lower.include?(keyword) }
    when 'equals'
      desc_lower == value.downcase
    else
      false
    end
  end

  def match_amount(amount)
    return false unless amount.present?

    threshold = BigDecimal(value)

    case operator
    when 'greater_than'
      amount > threshold
    when 'less_than'
      amount < threshold
    when 'equals'
      amount == threshold
    else
      false
    end
  rescue ArgumentError
    false
  end
end
