class CategoryRulesController < ApplicationController
  skip_before_action :verify_authenticity_token

  def index
    rules = CategoryRule.all.order(priority: :desc, created_at: :desc)
    render json: rules
  end

  def create
    rule = CategoryRule.new(rule_params)
    if rule.save
      render json: rule, status: :created
    else
      render json: { errors: rule.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    rule = CategoryRule.find(params[:id])
    if rule.update(rule_params)
      render json: rule
    else
      render json: { errors: rule.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    rule = CategoryRule.find(params[:id])
    rule.destroy
    render json: { success: true }, status: :ok
  end

  def categories
    # Get unique categories from rules and existing transactions
    rule_categories = CategoryRule.distinct.pluck(:category)
    transaction_categories = Transaction.where.not(category: [nil, '']).distinct.pluck(:category)

    # Combine and add default categories
    default_categories = [
      'Shopping',
      'Meals',
      'Transportation',
      'Entertainment',
      'Utilities',
      'Healthcare',
      'Travel',
      'Groceries'
    ]

    all_categories = (default_categories + rule_categories + transaction_categories).uniq.sort
    render json: all_categories
  end

  def apply_to_existing
    updated_count = CategoryRule.apply_to_uncategorized
    render json: {
      success: true,
      message: "Applied rules to #{updated_count} transaction(s)",
      updated_count: updated_count
    }
  end

  def reset_and_reapply
    updated_count = CategoryRule.reset_and_reapply_all
    render json: {
      success: true,
      message: "Reset and applied rules to #{updated_count} transaction(s)",
      updated_count: updated_count
    }
  end

  private

  def rule_params
    params.require(:rule).permit(:name, :field, :operator, :value, :category, :flag, :priority, :active)
  end
end
