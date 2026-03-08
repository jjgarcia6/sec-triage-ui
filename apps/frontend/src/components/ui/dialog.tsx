import * as React from 'react'

import { cn } from '@/lib/utils'

interface DialogContextValue {
  open: boolean
  setOpen: (next: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(): DialogContextValue {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('Dialog components must be used inside <Dialog>')
  }
  return context
}

interface DialogProps {
  open: boolean
  onOpenChange: (next: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</DialogContext.Provider>
}

type TriggerElement = React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>

export function DialogTrigger({ asChild, children }: { asChild?: boolean; children: TriggerElement }) {
  const { setOpen } = useDialogContext()

  if (!asChild) {
    return <button onClick={() => setOpen(true)}>{children}</button>
  }

  return React.cloneElement(children, {
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event)
      setOpen(true)
    },
  })
}

export function DialogContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = useDialogContext()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
      <div className={cn('w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg', className)} role="dialog" aria-modal="true">
        {children}
        <button
          type="button"
          className="sr-only"
          onClick={() => setOpen(false)}
          aria-label="Close dialog"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-2', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-4 flex justify-end gap-2', className)} {...props} />
}
