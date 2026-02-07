class CategoryRulesController < ApplicationController
  skip_before_action :verify_authenticity_token

  before_action :set_rule, only: [:update, :destroy]

  DEFAULT_CATEGORIES = %w[
    Shopping Meals Transportation Entertainment
    Utilities Healthcare Travel Groceries
  ].freeze

  def index
    render json: CategoryRule.by_priority.order(created_at: :desc)
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
    if @rule.update(rule_params)
      render json: @rule
    else
      render json: { errors: @rule.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @rule.destroy
    render json: { success: true }
  end

  def categories
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

  def set_rule
    @rule = CategoryRule.find(params[:id])
  end

  def rule_params
    params.require(:rule).permit(:name, :field, :operator, :value, :category, :flag, :priority, :active)
  end

  def all_categories
    (DEFAULT_CATEGORIES + rule_categories + transaction_categories).uniq.sort
  end

  def rule_categories
    CategoryRule.where.not(category: [nil, '']).distinct.pluck(:category)
  end

  def transaction_categories
    Transaction.where.not(category: [nil, '']).distinct.pluck(:category)
  end
end
