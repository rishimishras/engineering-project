import { useState } from 'react'
import type { Transaction } from './TransactionTable'
import { API_URL } from '../../config'

export interface EditForm {
  date: string
  description: string
  amount: string
  category: string
  flag: string
}

export const FLAG_OPTIONS = ['Valid', 'High Value', 'Review Required', 'Suspicious', 'Urgent', 'Recurring', 'Reviewed']

export interface UseTransactionActionsOptions {
  onSuccess?: () => void
}

export function useTransactionActions(options: UseTransactionActionsOptions = {}) {
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ date: '', description: '', amount: '', category: '', flag: '' })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: { flag: 'Reviewed' } }),
      })
      if (!response.ok) throw new Error('Failed to approve transaction')
      options.onSuccess?.()
    } catch (err) {
      console.error('Failed to approve transaction:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete transaction')
      options.onSuccess?.()
    } catch (err) {
      console.error('Failed to delete transaction:', err)
    }
  }

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditForm({
      date: transaction.date,
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category || '',
      flag: transaction.flag || 'Valid',
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingTransaction(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTransaction) return
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/transactions/${editingTransaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: {
            date: editForm.date,
            description: editForm.description,
            amount: parseFloat(editForm.amount),
            category: editForm.category || null,
            flag: editForm.flag || null,
          },
        }),
      })
      if (!response.ok) throw new Error('Failed to update transaction')
      closeEditModal()
      options.onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    // State
    editingTransaction,
    editForm,
    setEditForm,
    isEditModalOpen,
    isSubmitting,
    error,
    // Actions
    handleApprove,
    handleDelete,
    openEditModal,
    closeEditModal,
    handleEditSubmit,
  }
}
