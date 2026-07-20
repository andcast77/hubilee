import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  defaultValue: string
  children: React.ReactNode
  className?: string
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
  active?: boolean
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  active?: boolean
}

const TabsContext = React.createContext<{
  activeTab: string
  setActiveTab: (value: string) => void
}>({
  activeTab: '',
  setActiveTab: () => {}
})

const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}>
      {children}
    </div>
  )
}

const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value, 
  children, 
  className, 
  onClick,
  active 
}) => {
  const { setActiveTab } = React.useContext(TabsContext)
  
  const handleClick = () => {
    setActiveTab(value)
    onClick?.()
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-background text-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

const TabsContent: React.FC<TabsContentProps> = ({ 
  children, 
  className,
  active 
}) => {
  if (!active) return null
  
  return (
    <div className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}>
      {children}
    </div>
  )
}

// Hook to use tabs context
const useTabs = () => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('useTabs must be used within a Tabs component')
  }
  return context
}

export { Tabs, TabsList, TabsTrigger, TabsContent, useTabs } 
