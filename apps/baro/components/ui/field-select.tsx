'use client'

import * as React from 'react'

import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * FieldSelect is a standardized wrapper around Select with:
 * - position="popper" (for proper dropdown positioning in forms)
 * - size="field" (for consistent field sizing)
 */
export function FieldSelect({
  children,
  value,
  onValueChange,
  placeholder,
  ...props
}: React.ComponentProps<typeof Select> & {
  children?: React.ReactNode
  value?: string | number | null
  onValueChange?: (value: string | number | null) => void
  placeholder?: string
}) {
  return (
    <Select
      value={value == null ? undefined : String(value)}
      onValueChange={onValueChange ? (v) => onValueChange(v) : undefined}
      {...props}
    >
      <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
        {children}
      </SelectContent>
    </Select>
  )
}
FieldSelect.displayName = 'FieldSelect'