import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
  /** Width class for the panel, e.g. "max-w-lg" */
  className?: string
}

/** Radix Dialog styled like our previous hand-rolled modals (Esc + overlay close, focus trap). */
export function Modal({ onClose, children, className = 'max-w-lg' }: Props) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-xl focus:outline-none ${className}`}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const ModalTitle = Dialog.Title
export const ModalClose = Dialog.Close
