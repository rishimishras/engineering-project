# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
Transaction.create!([
  { date: '2024-06-01', description: 'Coffee at cafe', amount: 4.50, category: 'Food & Drink' },
  { date: '2024-06-02', description: 'Groceries', amount: 52.30, category: 'Groceries' },
  { date: '2024-06-03', description: 'Monthly Subscription', amount: 12.99, category: 'Subscriptions' },
  { date: '2024-06-04', description: 'Bus Ticket', amount: 2.75, category: 'Transport' },
  { date: '2024-06-05', description: 'Book Purchase', amount: 18.00, category: 'Education' }
])