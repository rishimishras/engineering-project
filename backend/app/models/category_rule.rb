class CategoryRule < ApplicationRecord
  FIELDS = %w[description amount].freeze
  OPERATORS = %w[contains equals greater_than less_than].freeze

  validates :name, :field, :operator, :value, presence: true
  validates :category, presence: true, if: -> { flag.blank? }
  validates :flag, presence: true, if: -> { category.blank? }
  validate :must_have_category_or_flag
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
    matching_rules = active.by_priority.select { |rule| rule.matches?(transaction) }

    # For category: prefer description rules, then any rule with category
    if transaction.category.blank?
      category_rule = matching_rules.find { |rule| rule.field == 'description' && rule.category.present? }
      category_rule ||= matching_rules.find { |rule| rule.category.present? }
      transaction.category = category_rule.category if category_rule
    end

    # For flag: prefer amount rules that match the transaction's category, then any amount rule with flag
    if transaction.flag.blank?
      determined_category = transaction.category
      flag_rule = matching_rules.find { |rule| rule.field == 'amount' && rule.flag.present? && rule.category == determined_category }
      flag_rule ||= matching_rules.find { |rule| rule.field == 'amount' && rule.flag.present? }
      flag_rule ||= matching_rules.find { |rule| rule.flag.present? }
      transaction.flag = flag_rule.flag if flag_rule
    end
  end

  # Apply rules to transactions missing category or flag
  def self.apply_to_uncategorized
    # Find transactions where category OR flag is missing
    transactions_to_update = Transaction.where('category IS NULL OR category = ? OR flag IS NULL OR flag = ?', '', '')
    updated_count = 0

    transactions_to_update.find_each do |transaction|
      matching_rule = active.by_priority.find { |rule| rule.matches?(transaction) }
      if matching_rule
        updates = {}
        # Only update if the field is currently blank
        updates[:category] = matching_rule.category if transaction.category.blank? && matching_rule.category.present?
        updates[:flag] = matching_rule.flag if transaction.flag.blank? && matching_rule.flag.present?

        if updates.any?
          transaction.update_columns(updates)
          updated_count += 1
        end
      end
    end

    updated_count
  end

  # Reset all flags and categories, then reapply all active rules
  def self.reset_and_reapply_all
    updated_count = 0

    Transaction.find_each do |transaction|
      matching_rules = active.by_priority.select { |rule| rule.matches?(transaction) }

      # For category: prefer description rules, then any rule with category
      category_rule = matching_rules.find { |rule| rule.field == 'description' && rule.category.present? }
      category_rule ||= matching_rules.find { |rule| rule.category.present? }
      determined_category = category_rule&.category

      # For flag: prefer amount rules that match the determined category, then any amount rule with flag
      flag_rule = matching_rules.find { |rule| rule.field == 'amount' && rule.flag.present? && rule.category == determined_category }
      flag_rule ||= matching_rules.find { |rule| rule.field == 'amount' && rule.flag.present? }
      flag_rule ||= matching_rules.find { |rule| rule.flag.present? }

      updates = {}
      updates[:category] = determined_category.presence
      updates[:flag] = flag_rule&.flag.presence

      # Only update if values changed
      if transaction.category != updates[:category] || transaction.flag != updates[:flag]
        transaction.update_columns(updates)
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

  def must_have_category_or_flag
    if category.blank? && flag.blank?
      errors.add(:base, 'Must assign either a category or a flag')
    end
  end
end
