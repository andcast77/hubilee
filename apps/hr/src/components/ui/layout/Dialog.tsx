import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface DialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-50">
        {children}
      </div>
    </div>
  )
}

const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => (
  <div className={cn(
    "relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4",
    className
  )}>
    {children}
  </div>
)

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => (
  <div className={cn("mb-4", className)}>
    {children}
  </div>
)

const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => (
  <h2 className={cn("text-lg font-semibold", className)}>
    {children}
  </h2>
)

const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, asChild }) => {
  if (asChild) {
    return <>{children}</>
  }
  return <>{children}</>
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } 
