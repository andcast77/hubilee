/**
 * Maquetación estándar Baro para documentos expediente (.docx).
 *
 * Usar en cualquier renderer con `docx` (ej. orden de trabajo). Las plantillas Word
 * servidas desde `context/*.docx` no pasan por aquí: conviene igualar tamaño/márgenes
 * en Word antes de distribuir el archivo.
 */

import { LineRuleType, PageOrientation } from 'docx'

const TWIPS_PER_INCH = 1440

/** OOXML: `w:after` / `w:before` en vigésimos de punto (1 pt = 20). */
const OOXML_SPACING_TWENTIES_PER_PT = 20

/** A4 en vertical (OOXML habitual de Word). */
export const EXPEDIENTE_DOCX_PAGE_SIZE_TWIP = {
  width: 11906,
  height: 16838,
} as const

/** Márgenes (pulgadas). Sup/inf 0,98; izq 1,18; der 0,79. Interior = lado izquierdo en retrato. */
export const EXPEDIENTE_DOCX_MARGIN_INCH = {
  top: 1,
  bottom: 1,
  left: 1.2,
  right: 0.8,
} as const

/** Sangría izquierda del bloque del párrafo (`w:left` / `w:start`). */
export const EXPEDIENTE_DOCX_BODY_LEFT_INDENT_INCH = 0.5 as const

/**
 * Sangría extra solo de la primera línea (`w:firstLine`), además del bloque `w:left`.
 * Las líneas siguientes del mismo párrafo alinean con el borde del bloque.
 */
export const EXPEDIENTE_DOCX_BODY_FIRST_LINE_INDENT_INCH = 20 / 25.4

/** Familia tipográfica estándar expediente (Word). */
export const EXPEDIENTE_DOCX_FONT_FAMILY = 'Arial' as const

/** Tamaño cuerpo (pt). */
export const EXPEDIENTE_DOCX_BODY_FONT_SIZE_PT = 12 as const

/** Tamaño bloques de firma (pt). */
export const EXPEDIENTE_DOCX_SIGNATURE_FONT_SIZE_PT = 9 as const

/** Espacio estándar debajo del párrafo (`w:after`). */
export const EXPEDIENTE_DOCX_BODY_PARAGRAPH_AFTER_PT = 6 as const

export function expedienteDocxFontSizeHalfPoints(points: number): number {
  return Math.round(points * 2)
}

export function expedienteWordInchesToTwip(inches: number): number {
  return Math.round(inches * TWIPS_PER_INCH)
}

export function expedienteDocxMarginsTwip(): {
  top: number
  right: number
  bottom: number
  left: number
} {
  return {
    top: expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.top),
    right: expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.right),
    bottom: expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.bottom),
    left: expedienteWordInchesToTwip(EXPEDIENTE_DOCX_MARGIN_INCH.left),
  }
}

/** Sangría izquierda de párrafo (solo el valor `w:left`, en twips). */
export function expedienteDocxBodyLeftIndentTwip(): number {
  return expedienteWordInchesToTwip(EXPEDIENTE_DOCX_BODY_LEFT_INDENT_INCH)
}

/** Sangría `w:start` + `w:left` (bloque) y `w:firstLine` (solo línea 1). */
export function expedienteDocxBodyParagraphIndent(): {
  start: number
  left: number
  firstLine: number
} {
  const left = expedienteDocxBodyLeftIndentTwip()
  return {
    start: left,
    left,
    firstLine: expedienteWordInchesToTwip(EXPEDIENTE_DOCX_BODY_FIRST_LINE_INDENT_INCH),
  }
}

/**
 * Espacio de párrafo estándar Baro (`w:spacing`): interlineado 1,5 y 6 pt debajo (`w:after`).
 *
 * OOXML `w:after` / `w:before` están en vigésimos de punto; 6 pt ⇒ 120.
 *
 * Pasar como `Paragraph({ spacing: expedienteDocxBodyLineSpacing(), ... })`.
 */
export function expedienteDocxBodyLineSpacing(): {
  after: number
  line: number
  lineRule: typeof LineRuleType.AUTO
} {
  return {
    after: EXPEDIENTE_DOCX_BODY_PARAGRAPH_AFTER_PT * OOXML_SPACING_TWENTIES_PER_PT,
    line: 360,
    lineRule: LineRuleType.AUTO,
  }
}

/**
 * Bloque `sections[n].properties.page` para tamaño/márgenes A4 estándar Baro en todas las hojas
 * de una sección (misma configuración página a página hasta nueva sección).
 */
export function expedienteDocxStandardSectionPage() {
  return {
    size: {
      ...EXPEDIENTE_DOCX_PAGE_SIZE_TWIP,
      orientation: PageOrientation.PORTRAIT,
    },
    margin: expedienteDocxMarginsTwip(),
  }
}
