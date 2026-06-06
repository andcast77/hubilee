'use client'

import * as React from 'react'
import { format, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  value?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  variant?: 'default' | 'compact'
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  className,
  disabled,
  variant = 'default',
}: DatePickerProps) {
  const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-slot="date-picker-trigger"
          className={cn(
            `flex w-full min-w-0 items-center justify-start gap-2 rounded-xl border border-input bg-transparent px-2.5 py-1 text-left text-sm font-normal whitespace-nowrap transition-colors outline-none select-none focus:border-ring focus:ring-3 focus:ring-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:border-ring aria-expanded:ring-3 aria-expanded:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
            variant === 'compact' ? 'h-9' : 'h-10',
            !date && 'text-muted-foreground',
            className
          )}
        >
          {/* Calendar icon — swaps to X on hover when date is selected */}
          {date ? (
            <span
              className="group relative size-4 shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onChange?.('')
              }}
            >
              <CalendarIcon className="size-4 transition-opacity group-hover:opacity-0" />
              <X className="absolute inset-0 size-4 text-muted-foreground transition-opacity opacity-0 group-hover:opacity-100" />
            </span>
          ) : (
            <CalendarIcon className="size-4 shrink-0" />
          )}
          <span className="flex-1 text-left">
            {date ? format(date, 'P', { locale: es }) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            if (newDate && onChange) {
              onChange(format(newDate, 'yyyy-MM-dd'))
              setOpen(false)
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
