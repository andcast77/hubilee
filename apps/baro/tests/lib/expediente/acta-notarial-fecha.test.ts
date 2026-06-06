import { describe, it, expect } from 'vitest'
import {
  parseActaNotarialFechaDate,
  parseActaNotarialFechaTime,
  combineActaNotarialFecha,
  toleranceMinutesToDisplay,
  parseToleranciaToMinutes,
  clampTolerance
} from '@/lib/expediente/acta-notarial-fecha'

describe('Acta Notarial Fecha Utilities', () => {
  describe('parseActaNotarialFechaDate', () => {
    it('should extract date from dd/mm/aaaa hh:mm format', () => {
      expect(parseActaNotarialFechaDate('15/05/2026 14:30')).toBe('2026-05-15')
      expect(parseActaNotarialFechaDate('01/01/2023 00:00')).toBe('2023-01-01')
      expect(parseActaNotarialFechaDate('31/12/2026 23:59')).toBe('2026-12-31')
    })

    it('should handle legacy ISO format yyyy-mm-ddThh:mm', () => {
      expect(parseActaNotarialFechaDate('2026-05-15T14:30')).toBe('2026-05-15')
      expect(parseActaNotarialFechaDate('2023-01-01T00:00')).toBe('2023-01-01')
    })

    it('should return empty string for invalid/unparseable input', () => {
      expect(parseActaNotarialFechaDate('')).toBe('')
      expect(parseActaNotarialFechaDate(null as unknown as string)).toBe('')
      expect(parseActaNotarialFechaDate(undefined as unknown as string)).toBe('')
      expect(parseActaNotarialFechaDate('invalid')).toBe('')
      expect(parseActaNotarialFechaDate('15-05-2026 14:30')).toBe('')
      expect(parseActaNotarialFechaDate('2026/05/15 14:30')).toBe('')
    })
  })

  describe('parseActaNotarialFechaTime', () => {
    it('should extract time from dd/mm/aaaa hh:mm format', () => {
      expect(parseActaNotarialFechaTime('15/05/2026 14:30')).toBe('14:30')
      expect(parseActaNotarialFechaTime('01/01/2023 00:00')).toBe('00:00')
      expect(parseActaNotarialFechaTime('31/12/2026 23:59')).toBe('23:59')
    })

    it('should handle legacy ISO format yyyy-mm-ddThh:mm', () => {
      expect(parseActaNotarialFechaTime('2026-05-15T14:30')).toBe('14:30')
      expect(parseActaNotarialFechaTime('2023-01-01T00:00')).toBe('00:00')
    })

    it('should return empty string for invalid/unparseable input', () => {
      expect(parseActaNotarialFechaTime('')).toBe('')
      expect(parseActaNotarialFechaTime(null as unknown as string)).toBe('')
      expect(parseActaNotarialFechaTime(undefined as unknown as string)).toBe('')
      expect(parseActaNotarialFechaTime('invalid')).toBe('')
      expect(parseActaNotarialFechaTime('15-05-2026 14:30')).toBe('')
      expect(parseActaNotarialFechaTime('2026/05/15 14:30')).toBe('')
    })
  })

  describe('combineActaNotarialFecha', () => {
    it('should combine date and time strings', () => {
      expect(combineActaNotarialFecha('2026-05-15', '14:30')).toBe('15/05/2026 14:30')
      expect(combineActaNotarialFecha('2023-01-01', '00:00')).toBe('01/01/2023 00:00')
      expect(combineActaNotarialFecha('2026-12-31', '23:59')).toBe('31/12/2026 23:59')
    })

    it('should return empty string when dateStr is empty', () => {
      expect(combineActaNotarialFecha('', '14:30')).toBe('')
      expect(combineActaNotarialFecha('', '')).toBe('')
    })

    it('should work with single digit month/day (though unlikely from picker)', () => {
      expect(combineActaNotarialFecha('2026-5-1', '14:30')).toBe('1/5/2026 14:30')
    })
  })

  describe('toleranceMinutesToDisplay', () => {
    it('should format tolerance minutes correctly', () => {
      expect(toleranceMinutesToDisplay(0)).toBe('')
      expect(toleranceMinutesToDisplay(30)).toBe('30 minutos')
      expect(toleranceMinutesToDisplay(60)).toBe('1 hora')
      expect(toleranceMinutesToDisplay(90)).toBe('1 hora 30 min')
      expect(toleranceMinutesToDisplay(120)).toBe('2 horas')
      expect(toleranceMinutesToDisplay(150)).toBe('2 horas 30 min')
      expect(toleranceMinutesToDisplay(180)).toBe('3 horas')
      expect(toleranceMinutesToDisplay(210)).toBe('3 horas 30 min')
      expect(toleranceMinutesToDisplay(240)).toBe('4 horas')
    })
  })

  describe('parseToleranciaToMinutes', () => {
    it('should parse tolerance values correctly', () => {
      expect(parseToleranciaToMinutes(null)).toBe(30)
      expect(parseToleranciaToMinutes(undefined)).toBe(30)
      expect(parseToleranciaToMinutes('')).toBe(30)
      expect(parseToleranciaToMinutes('30')).toBe(30)
      expect(parseToleranciaToMinutes('60')).toBe(60)
      expect(parseToleranciaToMinutes('120')).toBe(120)
    })

    it('should handle Spanish text (case-insensitive)', () => {
      expect(parseToleranciaToMinutes('30 Minutos')).toBe(30)
      expect(parseToleranciaToMinutes('1 Hora')).toBe(60)
      expect(parseToleranciaToMinutes('2 Horas')).toBe(120)
      expect(parseToleranciaToMinutes('30 minutos')).toBe(30)
      expect(parseToleranciaToMinutes('1 hora')).toBe(60)
      expect(parseToleranciaToMinutes('2 horas')).toBe(120)
      expect(parseToleranciaToMinutes('30 MINUTOS')).toBe(30)
      expect(parseToleranciaToMinutes('1 HORA')).toBe(60)
    })

    it('should extract first number and apply hora logic', () => {
      expect(parseToleranciaToMinutes('30 Minutos de espera')).toBe(30)
      expect(parseToleranciaToMinutes('1 Hora y 15 minutos')).toBe(60)
      expect(parseToleranciaToMinutes('2 Horas exactamente')).toBe(120)
      expect(parseToleranciaToMinutes('15 minutos')).toBe(15)
      expect(parseToleranciaToMinutes('90')).toBe(90)
    })
  })

  describe('clampTolerance', () => {
    it('should clamp values to [30, 240] range', () => {
      expect(clampTolerance(15)).toBe(30)
      expect(clampTolerance(30)).toBe(30)
      expect(clampTolerance(60)).toBe(60)
      expect(clampTolerance(240)).toBe(240)
      expect(clampTolerance(300)).toBe(240)
      expect(clampTolerance(1000)).toBe(240)
    })
  })
})