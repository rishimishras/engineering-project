import { useState, useEffect } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

interface Rule {
  id: number;
  name: string;
  field: string;
  operator: string;
  value: string;
  category: string;
  priority: number;
  active: boolean;
}

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRulesChange: () => void;
}

const FIELDS = [
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  description: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
  ],
  amount: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
  ],
};

const DEFAULT_CATEGORIES = [
  'Shopping',
  'Meals',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Travel',
  'Groceries',
  'High Value',
];

interface NewRuleForm {
  name: string;
  field: string;
  operator: string;
  value: string;
  category: string;
  priority: string;
}

export default function RulesModal({ isOpen, onClose, onRulesChange }: RulesModalProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewRuleForm>({
    name: '',
    field: 'description',
    operator: 'contains',
    value: '',
    category: '',
    priority: '0',
  });

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  const fetchRules = async () => {
    try {
      const response = await fetch('http://localhost:3000/category_rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      // Reset operator when field changes
      if (name === 'field') {
        updated.operator = OPERATORS[value][0].value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/category_rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule: {
            name: formData.name,
            field: formData.field,
            operator: formData.operator,
            value: formData.value,
            category: formData.category,
            priority: parseInt(formData.priority) || 0,
            active: true,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.errors?.join(', ') || 'Failed to create rule');
      }

      await fetchRules();
      onRulesChange();
      setIsCreating(false);
      setFormData({
        name: '',
        field: 'description',
        operator: 'contains',
        value: '',
        category: '',
        priority: '0',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:3000/category_rules/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchRules();
        onRulesChange();
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleToggleActive = async (rule: Rule) => {
    try {
      const response = await fetch(`http://localhost:3000/category_rules/${rule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule: { active: !rule.active },
        }),
      });
      if (response.ok) {
        await fetchRules();
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleApplyToExisting = async () => {
    setIsApplying(true);
    setApplyResult(null);
    try {
      const response = await fetch('http://localhost:3000/category_rules/apply_to_existing', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setApplyResult(data.message);
        onRulesChange();
      }
    } catch (err) {
      console.error('Failed to apply rules:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const getOperatorLabel = (field: string, operator: string) => {
    return OPERATORS[field]?.find(op => op.value === operator)?.label || operator;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-[60]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-7xl w-full rounded-lg bg-white p-8 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-xl font-bold text-gray-900 mb-4">
            Category Rules
          </DialogTitle>

          <p className="text-sm text-gray-600 mb-4">
            Rules automatically assign categories to new transactions based on conditions.
            Rules are applied in priority order (highest first).
          </p>

          {rules.length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700">
                  Apply rules to existing uncategorized transactions?
                </p>
                <button
                  type="button"
                  onClick={handleApplyToExisting}
                  disabled={isApplying}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {isApplying ? 'Applying...' : 'Apply Rules'}
                </button>
              </div>
              {applyResult && (
                <p className="mt-2 text-sm text-green-700">{applyResult}</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Existing Rules */}
          {rules.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Active Rules</h3>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      rule.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rule.name}</span>
                        <span className="text-xs text-gray-400">Priority: {rule.priority}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        If <span className="font-medium">{rule.field}</span>{' '}
                        <span className="text-indigo-600">{getOperatorLabel(rule.field, rule.operator)}</span>{' '}
                        "<span className="font-medium">{rule.value}</span>" → assign{' '}
                        <span className="font-medium text-green-600">{rule.category}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rule)}
                        className={`px-2 py-1 text-xs rounded ${
                          rule.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rule.active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create New Rule Form */}
          {isCreating ? (
            <form onSubmit={handleSubmit} className="border border-gray-200 rounded-md p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Create New Rule</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="rule-name" className="block text-sm font-medium text-gray-700">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    id="rule-name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Amazon Shopping"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="rule-field" className="block text-sm font-medium text-gray-700">
                      Field
                    </label>
                    <select
                      id="rule-field"
                      name="field"
                      value={formData.field}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="rule-operator" className="block text-sm font-medium text-gray-700">
                      Condition
                    </label>
                    <select
                      id="rule-operator"
                      name="operator"
                      value={formData.operator}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {OPERATORS[formData.field].map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="rule-value" className="block text-sm font-medium text-gray-700">
                      Value
                    </label>
                    <input
                      type={formData.field === 'amount' ? 'number' : 'text'}
                      id="rule-value"
                      name="value"
                      required
                      step={formData.field === 'amount' ? '0.01' : undefined}
                      value={formData.value}
                      onChange={handleInputChange}
                      placeholder={formData.field === 'description' ? 'Amazon, Cafe, Coffee' : '1000'}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {formData.field === 'description' && formData.operator === 'contains' && (
                  <p className="text-xs text-gray-500">
                    Tip: Use comma-separated values to match multiple keywords (e.g., "Cafe, Restaurant, Coffee")
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rule-category" className="block text-sm font-medium text-gray-700">
                      Assign Category
                    </label>
                    <select
                      id="rule-category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select a category</option>
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="rule-priority" className="block text-sm font-medium text-gray-700">
                      Priority
                    </label>
                    <input
                      type="number"
                      id="rule-priority"
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher priority rules are checked first</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700"
            >
              + Add New Rule
            </button>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700"
            >
              Done
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
