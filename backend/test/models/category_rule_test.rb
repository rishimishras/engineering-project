require "test_helper"

class CategoryRuleTest < ActiveSupport::TestCase
  # Validations
  test "valid rule with all required fields and category" do
    rule = CategoryRule.new(
      name: "Food Rule",
      field: "description",
      operator: "contains",
      value: "grocery",
      category: "Food"
    )
    assert rule.valid?
  end

  test "valid rule with flag instead of category" do
    rule = CategoryRule.new(
      name: "Large Purchase Flag",
      field: "amount",
      operator: "greater_than",
      value: "1000",
      flag: "Review"
    )
    assert rule.valid?
  end

  test "invalid without name" do
    rule = CategoryRule.new(field: "description", operator: "contains", value: "test", category: "Test")
    assert_not rule.valid?
    assert_includes rule.errors[:name], "can't be blank"
  end

  test "invalid without field" do
    rule = CategoryRule.new(name: "Test", operator: "contains", value: "test", category: "Test")
    assert_not rule.valid?
    assert_includes rule.errors[:field], "can't be blank"
  end

  test "invalid without operator" do
    rule = CategoryRule.new(name: "Test", field: "description", value: "test", category: "Test")
    assert_not rule.valid?
    assert_includes rule.errors[:operator], "can't be blank"
  end

  test "invalid without value" do
    rule = CategoryRule.new(name: "Test", field: "description", operator: "contains", category: "Test")
    assert_not rule.valid?
    assert_includes rule.errors[:value], "can't be blank"
  end

  test "invalid without category or flag" do
    rule = CategoryRule.new(name: "Test", field: "description", operator: "contains", value: "test")
    assert_not rule.valid?
    assert_includes rule.errors[:base], "Must assign either a category or a flag"
  end

  test "invalid field value" do
    rule = CategoryRule.new(
      name: "Test",
      field: "invalid_field",
      operator: "contains",
      value: "test",
      category: "Test"
    )
    assert_not rule.valid?
    assert_includes rule.errors[:field], "is not included in the list"
  end

  test "invalid operator value" do
    rule = CategoryRule.new(
      name: "Test",
      field: "description",
      operator: "invalid_operator",
      value: "test",
      category: "Test"
    )
    assert_not rule.valid?
    assert_includes rule.errors[:operator], "is not included in the list"
  end

  # Scopes
  test "active scope returns only active rules" do
    CategoryRule.delete_all
    active = CategoryRule.create!(name: "Active", field: "description", operator: "contains", value: "test", category: "Test", active: true)
    inactive = CategoryRule.create!(name: "Inactive", field: "description", operator: "equals", value: "test2", category: "Test2", active: false)

    result = CategoryRule.active
    assert_includes result, active
    assert_not_includes result, inactive
  end

  test "by_priority scope orders by priority descending" do
    CategoryRule.delete_all
    low = CategoryRule.create!(name: "Low", field: "description", operator: "contains", value: "a", category: "A", priority: 1)
    high = CategoryRule.create!(name: "High", field: "description", operator: "contains", value: "b", category: "B", priority: 10)
    medium = CategoryRule.create!(name: "Med", field: "description", operator: "contains", value: "c", category: "C", priority: 5)

    result = CategoryRule.by_priority.to_a
    assert_equal [high, medium, low], result
  end

  test "with_category scope returns rules with category" do
    CategoryRule.delete_all
    with_cat = CategoryRule.create!(name: "Cat", field: "description", operator: "contains", value: "a", category: "Food")
    with_flag = CategoryRule.create!(name: "Flag", field: "amount", operator: "greater_than", value: "100", flag: "Review")

    result = CategoryRule.with_category
    assert_includes result, with_cat
    assert_not_includes result, with_flag
  end

  # Matching logic - description field
  test "matches description with contains operator" do
    rule = CategoryRule.new(field: "description", operator: "contains", value: "grocery")
    transaction = Transaction.new(description: "Whole Foods Grocery Store")

    assert rule.matches?(transaction)
  end

  test "matches description with contains operator case insensitive" do
    rule = CategoryRule.new(field: "description", operator: "contains", value: "GROCERY")
    transaction = Transaction.new(description: "grocery store purchase")

    assert rule.matches?(transaction)
  end

  test "matches description with multiple keywords" do
    rule = CategoryRule.new(field: "description", operator: "contains", value: "grocery, supermarket, food")
    transaction = Transaction.new(description: "SuperMarket purchase")

    assert rule.matches?(transaction)
  end

  test "does not match description when keyword not present" do
    rule = CategoryRule.new(field: "description", operator: "contains", value: "grocery")
    transaction = Transaction.new(description: "Gas station")

    assert_not rule.matches?(transaction)
  end

  test "matches description with equals operator" do
    rule = CategoryRule.new(field: "description", operator: "equals", value: "netflix")
    transaction = Transaction.new(description: "Netflix")

    assert rule.matches?(transaction)
  end

  test "does not match partial with equals operator" do
    rule = CategoryRule.new(field: "description", operator: "equals", value: "netflix")
    transaction = Transaction.new(description: "Netflix subscription")

    assert_not rule.matches?(transaction)
  end

  # Matching logic - amount field
  test "matches amount with greater_than operator" do
    rule = CategoryRule.new(field: "amount", operator: "greater_than", value: "100")
    transaction = Transaction.new(amount: 150)

    assert rule.matches?(transaction)
  end

  test "does not match amount at boundary with greater_than" do
    rule = CategoryRule.new(field: "amount", operator: "greater_than", value: "100")
    transaction = Transaction.new(amount: 100)

    assert_not rule.matches?(transaction)
  end

  test "matches amount with less_than operator" do
    rule = CategoryRule.new(field: "amount", operator: "less_than", value: "50")
    transaction = Transaction.new(amount: 25)

    assert rule.matches?(transaction)
  end

  test "matches amount with equals operator" do
    rule = CategoryRule.new(field: "amount", operator: "equals", value: "99.99")
    transaction = Transaction.new(amount: BigDecimal("99.99"))

    assert rule.matches?(transaction)
  end

  # Helper methods
  test "keywords parses comma-separated values" do
    rule = CategoryRule.new(value: "grocery, food , supermarket")
    assert_equal ["grocery", "food", "supermarket"], rule.keywords
  end

  test "threshold returns BigDecimal for valid number" do
    rule = CategoryRule.new(value: "100.50")
    assert_equal BigDecimal("100.50"), rule.threshold
  end

  test "threshold returns nil for invalid number" do
    rule = CategoryRule.new(value: "not a number")
    assert_nil rule.threshold
  end

  test "target_field returns category when category present" do
    rule = CategoryRule.new(category: "Food")
    assert_equal :category, rule.target_field
  end

  test "target_field returns flag when only flag present" do
    rule = CategoryRule.new(flag: "Review")
    assert_equal :flag, rule.target_field
  end

  test "target_value returns category when category present" do
    rule = CategoryRule.new(category: "Food", flag: "Review")
    assert_equal "Food", rule.target_value
  end

  test "target_value returns flag when only flag present" do
    rule = CategoryRule.new(flag: "Review")
    assert_equal "Review", rule.target_value
  end
end
