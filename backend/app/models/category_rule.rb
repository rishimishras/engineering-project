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
  scope :with_category, -> { where.not(category: [nil, '']) }
  scope :with_flag, -> { where.not(flag: [nil, '']) }
  scope :for_field, ->(field_name) { where(field: field_name) }

  def matches?(transaction)
    send("match_#{field}", transaction.send(field))
  end

  def to_scope(base_scope)
    send("build_#{field}_scope", base_scope)
  end

  def keywords
    @keywords ||= value.split(',').map { |v| v.strip.downcase }
  end

  def threshold
    @threshold ||= BigDecimal(value)
  rescue ArgumentError
    nil
  end

  def target_field
    category.present? ? :category : :flag
  end

  def target_value
    category.present? ? category : flag
  end

  class << self
    def apply_rules(transaction)
      CategoryRules::RuleApplicator.new.apply_to_transaction(transaction)
    end

    def apply_rules_batch(scope = Transaction.all)
      CategoryRules::RuleApplicator.new(scope).apply_all
    end

    def apply_to_uncategorized
      CategoryRules::RuleApplicator.new(Transaction.uncategorized.or(Transaction.unflagged)).apply_all
    end

    def reset_and_reapply_all
      CategoryRules::RuleApplicator.new.reset_and_reapply
    end
  end

  private

  def match_description(description)
    return false if description.blank?

    desc_lower = description.downcase
    case operator
    when 'contains' then keywords.any? { |kw| desc_lower.include?(kw) }
    when 'equals' then keywords.any? { |kw| desc_lower == kw }
    else false
    end
  end

  def match_amount(amount)
    return false if amount.blank? || threshold.nil?

    case operator
    when 'greater_than' then amount > threshold
    when 'less_than' then amount < threshold
    when 'equals' then amount == threshold
    else false
    end
  end

  def build_description_scope(base_scope)
    case operator
    when 'contains'
      conditions = keywords.map { "LOWER(description) LIKE ?" }
      values = keywords.map { |kw| "%#{kw}%" }
      base_scope.where(conditions.join(' OR '), *values)
    when 'equals'
      conditions = keywords.map { "LOWER(description) = ?" }
      base_scope.where(conditions.join(' OR '), *keywords)
    end
  end

  def build_amount_scope(base_scope)
    return nil unless threshold

    case operator
    when 'greater_than' then base_scope.where('amount > ?', threshold)
    when 'less_than' then base_scope.where('amount < ?', threshold)
    when 'equals' then base_scope.where(amount: threshold)
    end
  end

  def must_have_category_or_flag
    return unless category.blank? && flag.blank?

    errors.add(:base, 'Must assign either a category or a flag')
  end
end
