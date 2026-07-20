import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  placeholder?: string
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  value: '',
  onValueChange: () => {},
  isOpen: false,
  setIsOpen: () => {}
})

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ 
      value: value || '', 
      onValueChange: onValueChange || (() => {}), 
      isOpen, 
      setIsOpen 
    }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  children, 
  className, 
  placeholder 
}) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)
  
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children || placeholder}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  const { isOpen } = React.useContext(SelectContext)
  
  if (!isOpen) return null
  
  return (
    <div className={cn(
      "absolute top-full left-0 right-0 z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md mt-1",
      className
    )}>
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

const SelectItem: React.FC<SelectItemProps> = ({ 
  value, 
  children, 
  className,
  onClick 
}) => {
  const { onValueChange, setIsOpen } = React.useContext(SelectContext)
  
  const handleClick = () => {
    onValueChange(value)
    setIsOpen(false)
    onClick?.()
  }

  return (
    <button
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

const SelectValue: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <span>{children}</span>
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } 
