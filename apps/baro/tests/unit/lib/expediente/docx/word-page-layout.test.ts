import { describe, expect, it } from 'vitest'
import { LineRuleType } from 'docx'
import {
  EXPEDIENTE_DOCX_BODY_FIRST_LINE_INDENT_INCH,
  EXPEDIENTE_DOCX_BODY_LEFT_INDENT_INCH,
  EXPEDIENTE_DOCX_BODY_FONT_SIZE_PT,
  EXPEDIENTE_DOCX_MARGIN_INCH,
  EXPEDIENTE_DOCX_SIGNATURE_FONT_SIZE_PT,
  expedienteDocxBodyLineSpacing,
  expedienteDocxBodyParagraphIndent,
  expedienteDocxFontSizeHalfPoints,
  expedienteDocxMarginsTwip,
  expedienteWordInchesToTwip,
} from '@/lib/expediente/docx/word-page-layout'

describe('expediente word-page-layout', () => {
  it('traduce pulgadas a twips esperados por Word (1440 twip/in)', () => {
    expect(expedienteWordInchesToTwip(1)).toBe(1440)
    expect(expedienteWordInchesToTwip(0.98)).toBe(1411)
    expect(expedienteWordInchesToTwip(1.18)).toBe(1699)
    expect(expedienteWordInchesToTwip(0.79)).toBe(1138)
    expect(expedienteWordInchesToTwip(0.49)).toBe(706)
  })

  it('margenes Baro siguen valores en pulgadas', () => {
    const m = expedienteDocxMarginsTwip()
    expect(m.top).toBe(expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.top))
    expect(m.bottom).toBe(expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.bottom))
    expect(m.left).toBe(expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.left))
    expect(m.right).toBe(expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.right))
  })

  it('sangria: bloque 0.49in + primera linea adicional (~10mm)', () => {
    const ind = expedienteDocxBodyParagraphIndent()
    const leftTwip = expedienteWordInchesToTwip(EXPEDIENTE_DOCX_BODY_LEFT_INDENT_INCH)
    const firstTwip = expedienteWordInchesToTwip(EXPEDIENTE_DOCX_BODY_FIRST_LINE_INDENT_INCH)
    expect(ind.left).toBe(leftTwip)
    expect(ind.start).toBe(leftTwip)
    expect(ind.firstLine).toBe(firstTwip)
  })

  it('interlineado 1.5 + 6 pt despues de cada parrafo', () => {
    const sp = expedienteDocxBodyLineSpacing()
    expect(sp.line).toBe(360)
    expect(sp.lineRule).toBe(LineRuleType.AUTO)
    expect(sp.after).toBe(120)
  })

  it('tamaño OOXML w:sz en medios puntos (pt * 2)', () => {
    expect(expedienteDocxFontSizeHalfPoints(EXPEDIENTE_DOCX_BODY_FONT_SIZE_PT)).toBe(24)
    expect(expedienteDocxFontSizeHalfPoints(EXPEDIENTE_DOCX_SIGNATURE_FONT_SIZE_PT)).toBe(18)
  })
})
