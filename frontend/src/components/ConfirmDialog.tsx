import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Tak', danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-warm-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-warm-200 dark:border-warm-800 animate-fade-in-up">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-full ${danger ? 'bg-red-100 dark:bg-red-900/20' : 'bg-primary-100 dark:bg-primary-900/20'}`}>
            <AlertTriangle size={20} className={danger ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-stone-600 dark:text-stone-400 border border-warm-200 dark:border-warm-800 rounded-xl hover:bg-warm-50 dark:hover:bg-warm-800 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
