module CategoryRules
  class RuleApplicator
    RULE_CONFIGS = {
      category: { field: 'description', override_column: :category_manual_override },
      flag: { field: 'amount', override_column: :flag_manual_override }
    }.freeze

    def initialize(scope = Transaction.all)
      @scope = scope
    end

    def apply_all
      return 0 if active_rules.empty?

      RULE_CONFIGS.sum { |type, _| apply_rules_for(type) }
    end

    def apply_to_transaction(transaction)
      matching_rules = active_rules.select { |rule| rule.matches?(transaction) }

      RULE_CONFIGS.each_key do |type|
        apply_to_single_transaction(transaction, matching_rules, type)
      end
    end

    def reset_and_reapply
      RULE_CONFIGS.each_value { |config| clear_non_protected(config[:override_column]) }
      apply_all
    end

    private

    attr_reader :scope

    def active_rules
      @active_rules ||= CategoryRule.active.by_priority.to_a
    end

    def apply_rules_for(type)
      config = RULE_CONFIGS[type]
      rules = filter_rules_for(type, config[:field])
      return 0 if rules.empty?

      base_scope = build_base_scope(type, config[:override_column])
      rules.sum { |rule| apply_rule_batch(base_scope, rule, type) }
    end

    def filter_rules_for(type, field)
      active_rules
        .select { |r| r.send(type).present? && r.field == field }
        .sort_by { |r| -r.priority }
    end

    def build_base_scope(type, override_column)
      scope
        .where(override_column => false)
        .where("#{type} IS NULL OR #{type} = ?", '')
    end

    def apply_rule_batch(base_scope, rule, type)
      matching_scope = rule.to_scope(base_scope)
      return 0 if matching_scope.nil?

      matching_scope.update_all(type => rule.send(type))
    end

    def apply_to_single_transaction(transaction, matching_rules, type)
      return if transaction.send(type).present?
      return if transaction.send("#{type}_manual_override")

      config = RULE_CONFIGS[type]
      rule = find_matching_rule(matching_rules, type, config[:field], transaction)
      transaction.send("#{type}=", rule.send(type)) if rule
    end

    def find_matching_rule(rules, type, preferred_field, transaction)
      # Try preferred field first, then any matching rule
      rule = rules.find { |r| r.field == preferred_field && r.send(type).present? }

      # For flags, also check category match
      if type == :flag && rule.nil?
        rule = rules.find { |r| r.field == preferred_field && r.flag.present? && r.category == transaction.category }
      end

      rule || rules.find { |r| r.send(type).present? }
    end

    def clear_non_protected(override_column)
      field = override_column.to_s.sub('_manual_override', '')
      Transaction.where(override_column => false).update_all(field => nil)
    end
  end
end
