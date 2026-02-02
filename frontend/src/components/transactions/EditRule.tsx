import React from 'react'

export interface Rule {
  id: number;
  name: string;
  field: string;
  operator: string;
  value: string;
  category: string;
  priority: number;
  active: boolean;
}

export interface RuleFormData {
  name: string;
  field: string;
  operator: string;
  value: string;
  category: string;
  priority: string;
}

export const FIELDS = [
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
];

export const OPERATORS: Record<string, { value: string; label: string }[]> = {
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

export const DEFAULT_CATEGORIES = [
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

interface EditRuleProps {
  rule: Rule;
  formData: RuleFormData;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: (ruleId: number) => void;
  onCancel: () => void;
}

export default function EditRule({
  rule,
  formData,
  isSubmitting,
  onInputChange,
  onSave,
  onCancel,
}: EditRuleProps) {
  return (
    <div className="p-4 bg-gray-50">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rule Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={onInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Field</label>
            <select
              name="field"
              value={formData.field}
              onChange={onInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {FIELDS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Condition</label>
            <select
              name="operator"
              value={formData.operator}
              onChange={onInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {OPERATORS[formData.field].map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Value</label>
            <input
              type={formData.field === 'amount' ? 'number' : 'text'}
              name="value"
              step={formData.field === 'amount' ? '0.01' : undefined}
              value={formData.value}
              onChange={onInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Assign Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={onInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Select a category</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <input
              type="number"
              name="priority"
              value={formData.priority}
              onChange={onInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(rule.id)}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
