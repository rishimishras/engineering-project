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

  # Apply rules to transactions missing category or flag (OPTIMIZED with batch SQL)
  def self.apply_to_uncategorized
    apply_rules_batch(Transaction.where('category IS NULL OR category = ? OR flag IS NULL OR flag = ?', '', ''))
  end

  # Optimized batch rule application using SQL updates
  def self.apply_rules_batch(scope = Transaction.all)
    rules = active.by_priority.to_a
    return 0 if rules.empty?

    updated_count = 0

    # Apply category rules (description-based first, highest priority)
    category_rules = rules.select { |r| r.category.present? }
    description_rules = category_rules.select { |r| r.field == 'description' }.sort_by { |r| -r.priority }

    description_rules.each do |rule|
      count = apply_rule_batch(scope.where('category IS NULL OR category = ?', ''), rule, :category)
      updated_count += count
    end

    # Apply flag rules (amount-based, highest priority)
    flag_rules = rules.select { |r| r.flag.present? }
    amount_rules = flag_rules.select { |r| r.field == 'amount' }.sort_by { |r| -r.priority }

    amount_rules.each do |rule|
      count = apply_rule_batch(scope.where('flag IS NULL OR flag = ?', ''), rule, :flag)
      updated_count += count
    end

    updated_count
  end

  # Apply a single rule to matching transactions in batch
  def self.apply_rule_batch(scope, rule, field_to_update)
    matching_scope = build_matching_scope(scope, rule)
    return 0 if matching_scope.nil?

    value_to_set = field_to_update == :category ? rule.category : rule.flag
    matching_scope.update_all(field_to_update => value_to_set)
  end

  # Build SQL scope for matching transactions
  def self.build_matching_scope(scope, rule)
    case rule.field
    when 'description'
      case rule.operator
      when 'contains'
        keywords = rule.value.split(',').map(&:strip)
        conditions = keywords.map { |kw| "LOWER(description) LIKE ?" }
        values = keywords.map { |kw| "%#{kw.downcase}%" }
        scope.where(conditions.join(' OR '), *values)
      when 'equals'
        keywords = rule.value.split(',').map(&:strip)
        conditions = keywords.map { "LOWER(description) = ?" }
        values = keywords.map { |kw| kw.downcase }
        scope.where(conditions.join(' OR '), *values)
      end
    when 'amount'
      threshold = BigDecimal(rule.value) rescue nil
      return nil unless threshold

      case rule.operator
      when 'greater_than'
        scope.where('amount > ?', threshold)
      when 'less_than'
        scope.where('amount < ?', threshold)
      when 'equals'
        scope.where(amount: threshold)
      end
    end
  end

  # Reset all flags and categories, then reapply all active rules (OPTIMIZED)
  # Excludes transactions with flag 'Reviewed' to preserve manually reviewed items
  def self.reset_and_reapply_all
    # Exclude reviewed transactions from reset
    scope = Transaction.where.not(flag: 'Reviewed')

    # Clear categories and flags for non-reviewed transactions
    scope.update_all(category: nil, flag: nil)

    # Apply rules using optimized batch method (only to non-reviewed)
    apply_rules_batch(scope)
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
      keywords = value.split(',').map(&:strip).map(&:downcase)
      keywords.any? { |keyword| desc_lower == keyword }
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
