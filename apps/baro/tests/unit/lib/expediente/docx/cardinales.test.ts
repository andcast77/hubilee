import { describe, expect, it } from 'vitest'
import {
  cardinalFromRumbo,
  formatCardinalesColindantes,
} from '@/lib/expediente/docx/cardinales'

describe('cardinalFromRumbo', () => {
  it('reconoce los 4 cardinales por nombre completo', () => {
    expect(cardinalFromRumbo('Norte')).toBe('Norte')
    expect(cardinalFromRumbo('SUR')).toBe('Sur')
    expect(cardinalFromRumbo('este')).toBe('Este')
    expect(cardinalFromRumbo('Oeste')).toBe('Oeste')
  })

  it('reconoce abreviaciones simples (N/S/E/O seguidas de borde de palabra)', () => {
    expect(cardinalFromRumbo('N - 20m')).toBe('Norte')
    expect(cardinalFromRumbo('S 15m')).toBe('Sur')
    expect(cardinalFromRumbo('E')).toBe('Este')
    expect(cardinalFromRumbo('O 10m')).toBe('Oeste')
  })

  it('devuelve null para rumbos vacíos o no reconocidos', () => {
    expect(cardinalFromRumbo('')).toBe(null)
    expect(cardinalFromRumbo('   ')).toBe(null)
    expect(cardinalFromRumbo('xyz')).toBe(null)
  })

  it('reconoce contenido extra después del cardinal', () => {
    expect(cardinalFromRumbo('Norte (calle X)')).toBe('Norte')
    expect(cardinalFromRumbo('Sur, lote vecino')).toBe('Sur')
  })
})

describe('formatCardinalesColindantes', () => {
  it('devuelve cadena vacía cuando no hay rumbos reconocibles', () => {
    expect(formatCardinalesColindantes([])).toBe('')
    expect(formatCardinalesColindantes(['xyz', '???'])).toBe('')
  })

  it('un único cardinal lo devuelve tal cual', () => {
    expect(formatCardinalesColindantes(['Norte'])).toBe('Norte')
    expect(formatCardinalesColindantes(['este'])).toBe('Este')
  })

  it('dos cardinales unidos por "y"', () => {
    expect(formatCardinalesColindantes(['Norte', 'Sur'])).toBe('Norte y Sur')
  })

  it('tres o más cardinales: lista con coma + "y" final', () => {
    expect(formatCardinalesColindantes(['Norte', 'Sur', 'Este'])).toBe('Norte, Sur y Este')
    expect(formatCardinalesColindantes(['Norte', 'Sur', 'Este', 'Oeste'])).toBe(
      'Norte, Sur, Este y Oeste'
    )
  })

  it('respeta orden N/S/E/O independientemente del orden de entrada', () => {
    expect(formatCardinalesColindantes(['Oeste', 'Norte', 'Sur'])).toBe('Norte, Sur y Oeste')
  })

  it('deduplica cardinales repetidos', () => {
    expect(formatCardinalesColindantes(['Norte', 'Norte', 'Sur'])).toBe('Norte y Sur')
  })
})
