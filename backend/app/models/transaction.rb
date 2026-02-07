class Transaction < ApplicationRecord
  validates :date, :description, :amount, presence: true
  validates :amount, numericality: true

  before_validation :apply_category_rules, on: :create
  after_commit :detect_anomalies, on: :create

  scope :uncategorized, -> { where('category IS NULL OR category = ?', '') }
  scope :unflagged, -> { where('flag IS NULL OR flag = ?', '') }
  scope :flagged, -> { where.not(flag: [nil, '', 'Valid', 'Reviewed']) }

  class << self
    def duplicate?(date, description, amount)
      exists?(date: date, description: description, amount: amount)
    end

    def detect_anomalies(scope = all)
      Transactions::AnomalyDetector.new(scope).detect_all
    end
  end

  private

  def apply_category_rules
    CategoryRules::RuleApplicator.new.apply_to_transaction(self)
  end

  def detect_anomalies
    Transactions::AnomalyDetector.new.detect_for_transaction(self)
  end
end
