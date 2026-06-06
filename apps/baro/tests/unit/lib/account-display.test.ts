import { describe, expect, it } from 'vitest'
import {
  initialsFromDisplayName,
  professionalTitleLabel,
  sidebarAccountName,
} from '@/lib/professional/display'

describe('account-display', () => {
  it('professionalTitleLabel maps titles (masculino por defecto)', () => {
    expect(professionalTitleLabel('AGRIMENSOR')).toBe('Agrimensor')
    expect(professionalTitleLabel('INGENIERO_AGRIMENSOR')).toBe('Ingeniero Agrimensor')
    expect(professionalTitleLabel('AGRIMENSOR', 'FEMENINO')).toBe('Agrimensora')
    expect(professionalTitleLabel('INGENIERO_AGRIMENSOR', 'FEMENINO')).toBe('Ingeniera Agrimensora')
  })

  it('initialsFromDisplayName uses first and last word', () => {
    expect(initialsFromDisplayName('Ana María Pérez', 'x@y.com')).toBe('AP')
  })

  it('initialsFromDisplayName falls back to email local part', () => {
    expect(initialsFromDisplayName(undefined, 'dev@baro.local')).toBe('DE')
  })

  it('sidebarAccountName prefers display name', () => {
    expect(sidebarAccountName('Ana Pérez', 'a@b.com')).toBe('Ana Pérez')
    expect(sidebarAccountName(undefined, 'a@b.com')).toBe('a@b.com')
  })
})
