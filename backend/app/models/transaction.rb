class Transaction < ApplicationRecord
  validates :date, :description, :amount, presence: true
  validates :amount, numericality: true

  # Check if a transaction with same date, description, and amount already exists
  def self.duplicate?(date, description, amount)
    exists?(date: date, description: description, amount: amount)
  end
end
