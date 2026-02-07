import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateTransactionModal from './CreateTransactionModal'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('CreateTransactionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    categories: ['Food', 'Transportation', 'Entertainment', 'Utilities'],
    onOpenRules: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Rendering tests
  it('renders the modal when isOpen is true', () => {
    render(<CreateTransactionModal {...defaultProps} />)

    expect(screen.getByText('Create Transaction')).toBeInTheDocument()
    expect(screen.getByLabelText(/Date/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<CreateTransactionModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Create Transaction')).not.toBeInTheDocument()
  })

  it('renders category options from props', () => {
    render(<CreateTransactionModal {...defaultProps} />)

    const categorySelect = screen.getByLabelText(/Category/)
    expect(categorySelect).toBeInTheDocument()

    defaultProps.categories.forEach(category => {
      expect(screen.getByRole('option', { name: category })).toBeInTheDocument()
    })
  })

  it('shows "New Rule" button', () => {
    render(<CreateTransactionModal {...defaultProps} />)

    expect(screen.getByText('+ New Rule')).toBeInTheDocument()
  })

  // Form interaction tests
  it('updates form values on input change', async () => {
    const user = userEvent.setup()
    render(<CreateTransactionModal {...defaultProps} />)

    const dateInput = screen.getByLabelText(/Date/)
    const descInput = screen.getByLabelText(/Description/)
    const amountInput = screen.getByLabelText(/Amount/)

    await user.type(descInput, 'Coffee Shop')
    await user.type(amountInput, '5.50')
    await user.clear(dateInput)
    await user.type(dateInput, '2024-01-15')

    expect(descInput).toHaveValue('Coffee Shop')
    expect(amountInput).toHaveValue(5.5)
  })

  it('selects a category from dropdown', async () => {
    const user = userEvent.setup()
    render(<CreateTransactionModal {...defaultProps} />)

    const categorySelect = screen.getByLabelText(/Category/)
    await user.selectOptions(categorySelect, 'Food')

    expect(categorySelect).toHaveValue('Food')
  })

  // Form submission tests
  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        date: '2024-01-15',
        description: 'Coffee Shop',
        amount: 5.50,
        category: 'Food',
      }),
    })

    render(<CreateTransactionModal {...defaultProps} />)

    await user.type(screen.getByLabelText(/Description/), 'Coffee Shop')
    await user.type(screen.getByLabelText(/Amount/), '5.50')
    await user.clear(screen.getByLabelText(/Date/))
    await user.type(screen.getByLabelText(/Date/), '2024-01-15')
    await user.selectOptions(screen.getByLabelText(/Category/), 'Food')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/transactions'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Coffee Shop'),
        })
      )
    })
  })

  it('calls onSuccess after successful submission', async () => {
    const user = userEvent.setup()
    const mockTransaction = {
      id: 1,
      date: '2024-01-15',
      description: 'Coffee Shop',
      amount: 5.50,
      category: 'Food',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTransaction,
    })

    render(<CreateTransactionModal {...defaultProps} />)

    await user.type(screen.getByLabelText(/Description/), 'Coffee Shop')
    await user.type(screen.getByLabelText(/Amount/), '5.50')
    await user.clear(screen.getByLabelText(/Date/))
    await user.type(screen.getByLabelText(/Date/), '2024-01-15')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockTransaction)
    })
  })

  it('calls onError when submission fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
    })

    render(<CreateTransactionModal {...defaultProps} />)

    await user.type(screen.getByLabelText(/Description/), 'Test')
    await user.type(screen.getByLabelText(/Amount/), '10')
    await user.clear(screen.getByLabelText(/Date/))
    await user.type(screen.getByLabelText(/Date/), '2024-01-15')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Failed to create transaction')
    })
  })

  it('calls onError when network error occurs', async () => {
    const user = userEvent.setup()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<CreateTransactionModal {...defaultProps} />)

    await user.type(screen.getByLabelText(/Description/), 'Test')
    await user.type(screen.getByLabelText(/Amount/), '10')
    await user.clear(screen.getByLabelText(/Date/))
    await user.type(screen.getByLabelText(/Date/), '2024-01-15')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(defaultProps.onError).toHaveBeenCalledWith('Network error')
    })
  })

  // Modal close tests
  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateTransactionModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('clears form when modal is closed', async () => {
    const user = userEvent.setup()
    render(<CreateTransactionModal {...defaultProps} />)

    await user.type(screen.getByLabelText(/Description/), 'Test description')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('closes modal after successful Save', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    })

    render(<CreateTransactionModal {...defaultProps} />)

    await user.type(screen.getByLabelText(/Description/), 'Test')
    await user.type(screen.getByLabelText(/Amount/), '10')
    await user.clear(screen.getByLabelText(/Date/))
    await user.type(screen.getByLabelText(/Date/), '2024-01-15')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  // Create Another Transaction button tests
  it('keeps modal open when "Create Another Transaction" is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    })

    render(<CreateTransactionModal {...defaultProps} />)

    await user.type(screen.getByLabelText(/Description/), 'Test')
    await user.type(screen.getByLabelText(/Amount/), '10')
    await user.clear(screen.getByLabelText(/Date/))
    await user.type(screen.getByLabelText(/Date/), '2024-01-15')

    await user.click(screen.getByRole('button', { name: 'Create Another Transaction' }))

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })

    // Modal should still be open (onClose not called)
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  // New Rule button test
  it('calls onOpenRules when "+ New Rule" is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateTransactionModal {...defaultProps} />)

    await user.click(screen.getByText('+ New Rule'))

    expect(defaultProps.onOpenRules).toHaveBeenCalled()
  })

  // Form validation tests (HTML5 native validation)
  it('has required attribute on required fields', () => {
    render(<CreateTransactionModal {...defaultProps} />)

    expect(screen.getByLabelText(/Date/)).toBeRequired()
    expect(screen.getByLabelText(/Description/)).toBeRequired()
    expect(screen.getByLabelText(/Amount/)).toBeRequired()
  })

  it('category field is optional', () => {
    render(<CreateTransactionModal {...defaultProps} />)

    expect(screen.getByLabelText(/Category/)).not.toBeRequired()
  })

  // Amount field accepts step of 0.01
  it('amount field accepts decimal values', () => {
    render(<CreateTransactionModal {...defaultProps} />)

    const amountInput = screen.getByLabelText(/Amount/)
    expect(amountInput).toHaveAttribute('step', '0.01')
  })
})
