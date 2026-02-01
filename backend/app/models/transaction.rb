class Transaction < ApplicationRecord
  validates :date, :description, :amount, presence: true
  validates :amount, numericality: true

  before_validation :apply_category_rules, on: :create

  # Check if a transaction with same date, description, and amount already exists
  def self.duplicate?(date, description, amount)
    exists?(date: date, description: description, amount: amount)
  end

  private

  def apply_category_rules
    CategoryRule.apply_rules(self)
  end
end
