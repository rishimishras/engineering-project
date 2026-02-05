import { useState } from 'react'
import RulesModal from './transactions/RulesModal'

interface CategoryRulesButtonProps {
  onRulesChange?: () => void
  onTransactionsChange?: () => void
  className?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function CategoryRulesButton({
  onRulesChange,
  onTransactionsChange,
  className = 'px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 border border-indigo-600 rounded-md hover:bg-indigo-50',
  isOpen: controlledOpen,
  onOpenChange,
}: CategoryRulesButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const setOpen = (open: boolean) => {
    if (onOpenChange) onOpenChange(open)
    if (!isControlled) setInternalOpen(open)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        Rules
      </button>
      <RulesModal
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        onRulesChange={onRulesChange ?? (() => {})}
        onTransactionsChange={onTransactionsChange ?? (() => {})}
      />
    </>
  )
}
