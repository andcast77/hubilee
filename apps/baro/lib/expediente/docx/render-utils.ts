import {
  AlignmentType,
  FootnoteReferenceRun,
  type IRunOptions,
  LineRuleType,
  Paragraph,
  SimpleField,
  Table,
  TableBorders,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx'
import type { OrdenTrabajoOrdenanteDto, OrdenTrabajoProfesionalDto } from './document-render-data'
import {
  EXPEDIENTE_DOCX_BODY_FONT_SIZE_PT,
  EXPEDIENTE_DOCX_FONT_FAMILY,
  EXPEDIENTE_DOCX_PAGE_SIZE_TWIP,
  EXPEDIENTE_DOCX_SIGNATURE_FONT_SIZE_PT,
  expedienteDocxBodyLeftIndentTwip,
  expedienteDocxBodyParagraphIndent,
  expedienteDocxFontSizeHalfPoints,
  expedienteDocxMarginsTwip,
} from './word-page-layout'

const BODY_PARAGRAPH_INDENT = expedienteDocxBodyParagraphIndent()
const BODY_PARAGRAPH_SPACING = {
  before: 300,
  after: 0,
  line: 360,
  lineRule: LineRuleType.AUTO,
} as const

/** Pie: sólo sangría de bloque 0,49" (sin firstLine ~20mm del cuerpo). */
const FOOTER_PARAGRAPH_INDENT = (() => {
  const left = expedienteDocxBodyLeftIndentTwip()
  return { start: left, left, firstLine: 0 }
})()

/** Firma: sin 6pt bajo cada línea; interlineado más cerrado. */
const SIGNATURE_PARAGRAPH_SPACING = {
  before: 0,
  after: 0,
  line: 240,
  lineRule: LineRuleType.AUTO,
} as const

const BODY_RUN_SIZE = expedienteDocxFontSizeHalfPoints(EXPEDIENTE_DOCX_BODY_FONT_SIZE_PT)
const SIGNATURE_RUN_SIZE = expedienteDocxFontSizeHalfPoints(EXPEDIENTE_DOCX_SIGNATURE_FONT_SIZE_PT)

/** Ancho relativo: columna central ~50% como separación entre firmas (~25% cada bloque). */
const FIRMA_GAP_FRAC = 0.5

/** Línea de puntos acotada al ancho de columna de firma. */
const SIGNATURE_DOTS = '. '.repeat(22)
/** Cantidad de renglones en blanco bajo la línea de puntos para firma manuscrita. */
const SIGNATURE_SIGNING_GAP_LINES = 6

function t(s: string | null | undefined): string {
  return (s ?? '').trim()
}

export type FirmasTableInput = {
  ordenantes: OrdenTrabajoOrdenanteDto[]
  principal: OrdenTrabajoProfesionalDto
  segundo: OrdenTrabajoProfesionalDto | null
}

export function runBody(text: string, extra: Partial<IRunOptions> = {}): TextRun {
  return new TextRun({
    text,
    font: EXPEDIENTE_DOCX_FONT_FAMILY,
    size: BODY_RUN_SIZE,
    ...extra,
  })
}

export function runSignature(text: string, extra: Partial<IRunOptions> = {}): TextRun {
  return new TextRun({
    text,
    font: EXPEDIENTE_DOCX_FONT_FAMILY,
    size: SIGNATURE_RUN_SIZE,
    ...extra,
  })
}

/** Línea en blanco (separador visual entre título / fecha / cuerpo). */
export function pBlankLine(): Paragraph {
  return new Paragraph({
    spacing: {
      before: 0,
      after: 0,
      line: 300,
      lineRule: LineRuleType.AUTO,
    },
    children: [runBody('')],
  })
}

export function pBody(text: string): Paragraph {
  return new Paragraph({
    spacing: BODY_PARAGRAPH_SPACING,
    alignment: AlignmentType.JUSTIFIED,
    keepLines: true,
    indent: { ...BODY_PARAGRAPH_INDENT },
    children: [runBody(text)],
  })
}

/** Cuerpo que debe quedar unido al siguiente párrafo (evita títulos/subtítulos "huérfanos"). */
export function pBodyKeepNext(text: string): Paragraph {
  return new Paragraph({
    spacing: BODY_PARAGRAPH_SPACING,
    alignment: AlignmentType.JUSTIFIED,
    keepLines: true,
    keepNext: true,
    indent: { ...BODY_PARAGRAPH_INDENT },
    children: [runBody(text)],
  })
}

/** Párrafo de cuerpo con varios runs (p. ej. una parte en negrita). */
export function pBodyRuns(runs: readonly (TextRun | FootnoteReferenceRun)[]): Paragraph {
  return new Paragraph({
    spacing: BODY_PARAGRAPH_SPACING,
    alignment: AlignmentType.JUSTIFIED,
    keepLines: true,
    indent: { ...BODY_PARAGRAPH_INDENT },
    children: [...runs],
  })
}

/** Título estándar: centrado, negrita y spacing propio de título. */
export function pTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: {
      before: 0,
      after: 300,
      line: 360,
      lineRule: LineRuleType.AUTO,
    },
    alignment: AlignmentType.CENTER,
    children: [runBody(text, { bold: true })],
  })
}

/** @deprecated Use `pTitle()` */
export function pBodyCenteredBold(text: string): Paragraph {
  return pTitle(text)
}

/** Fecha sin sangría de cuerpo, al borde derecho del área útil. */
export function pFechaRight(text: string): Paragraph {
  return new Paragraph({
    spacing: BODY_PARAGRAPH_SPACING,
    alignment: AlignmentType.RIGHT,
    children: [runBody(text)],
  })
}

export function pSignatureCentered(text: string): Paragraph {
  return new Paragraph({
    spacing: SIGNATURE_PARAGRAPH_SPACING,
    alignment: AlignmentType.CENTER,
    keepLines: true,
    children: [runSignature(text)],
  })
}

export function pConsultasFooter(text: string): Paragraph {
  return new Paragraph({
    spacing: BODY_PARAGRAPH_SPACING,
    alignment: AlignmentType.JUSTIFIED,
    indent: FOOTER_PARAGRAPH_INDENT,
    children: [runSignature(text)],
  })
}

export type ConsultasFooterSource = {
  direccionConsultasLinea: string | null
  celularLinea: string | null
  correoLinea: string | null
  horarioLinea: string | null
}

export function buildConsultasFooterText(source: ConsultasFooterSource): string | null {
  const parts: string[] = []
  const dom = t(source.direccionConsultasLinea)
  const cel = t(source.celularLinea)
  const mail = t(source.correoLinea)
  const ho = t(source.horarioLinea)

  if (dom) parts.push(`Consultas: ${dom}`)
  if (cel) parts.push(`Celular: ${cel}`)
  if (mail) parts.push(`Correo: ${mail}`)
  if (ho) parts.push(`Horario: ${ho}`)

  if (parts.length === 0) return null
  return parts.join(', ')
}

/**
 * Muestra texto de consultas sólo en la última página usando campo IF de Word:
 * IF PAGE = NUMPAGES.
 */
export function pConsultasFooterLastPageOnly(data: {
  principal: {
    direccionConsultasLinea: string | null
    celularLinea: string | null
    correoLinea: string | null
    horarioLinea: string | null
  }
}): Paragraph {
  const text = buildConsultasFooterText(data.principal) ?? ''
  const escaped = text.replace(/"/g, '""')
  return new Paragraph({
    spacing: BODY_PARAGRAPH_SPACING,
    alignment: AlignmentType.JUSTIFIED,
    indent: FOOTER_PARAGRAPH_INDENT,
    children: [new SimpleField(`IF PAGE = NUMPAGES "${escaped}" ""`)],
  })
}

function emptySignatureCell(): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlignTable.TOP,
    children: [
      new Paragraph({
        spacing: SIGNATURE_PARAGRAPH_SPACING,
        alignment: AlignmentType.CENTER,
        children: [runSignature('')],
      }),
    ],
  })
}

/** Celda sólo separación (columna media sin contenido). */
export function signatureGapCell(): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlignTable.TOP,
    children: [
      new Paragraph({
        spacing: SIGNATURE_PARAGRAPH_SPACING,
        children: [runSignature('')],
      }),
    ],
  })
}

export function signatureCell(children: Paragraph[]): TableCell {
  if (children.length === 0) return emptySignatureCell()
  return new TableCell({
    verticalAlign: VerticalAlignTable.TOP,
    children,
  })
}

export function signaturePairRow(left: Paragraph[], right: Paragraph[]): TableRow {
  return new TableRow({
    cantSplit: true,
    children: [signatureCell(left), signatureGapCell(), signatureCell(right)],
  })
}

export function ordenanteSignatureParagraphs(o: OrdenTrabajoOrdenanteDto): Paragraph[] {
  const name = t(o.nombre)
  if (!name) return []
  const lines: Paragraph[] = []
  for (let i = 0; i < SIGNATURE_SIGNING_GAP_LINES; i += 1) {
    lines.push(pSignatureCentered(''))
  }
  lines.push(
    new Paragraph({
      spacing: SIGNATURE_PARAGRAPH_SPACING,
      alignment: AlignmentType.CENTER,
      keepLines: true,
      children: [runSignature(SIGNATURE_DOTS)],
    })
  )
  lines.push(pSignatureCentered(name))
  const car = t(o.caracter)
  if (car) lines.push(pSignatureCentered(car))
  const dni = t(o.documento)
  if (dni) lines.push(pSignatureCentered(`DNI ${dni}`))
  const cui = t(o.cuit)
  if (cui) lines.push(pSignatureCentered(`CUIT ${cui}`))
  return lines
}

export function profesionalSignatureParagraphs(who: OrdenTrabajoProfesionalDto): Paragraph[] {
  const lines: Paragraph[] = []
  for (let i = 0; i < SIGNATURE_SIGNING_GAP_LINES; i += 1) {
    lines.push(pSignatureCentered(''))
  }
  lines.push(
    new Paragraph({
      spacing: SIGNATURE_PARAGRAPH_SPACING,
      alignment: AlignmentType.CENTER,
      keepLines: true,
      children: [runSignature(SIGNATURE_DOTS)],
    })
  )
  const name = t(who.displayName)
  const ti = t(who.tituloEs)
  const mcp = t(who.mcp)
  const cui = t(who.cuit)
  const dni = t(who.dni)

  if (name) lines.push(pSignatureCentered(name))
  if (ti && mcp) {
    lines.push(pSignatureCentered(ti))
    lines.push(pSignatureCentered(`M.C.P. ${mcp}`))
  } else if (ti) lines.push(pSignatureCentered(ti))
  else if (mcp) lines.push(pSignatureCentered(`M.C.P. ${mcp}`))

  if (cui && dni) lines.push(pSignatureCentered(`CUIT ${cui} DNI ${dni}`))
  else if (cui) lines.push(pSignatureCentered(`CUIT ${cui}`))
  else if (dni) lines.push(pSignatureCentered(`DNI ${dni}`))

  return lines
}

/** Tres columnas: firma | ~50% hueco | firma. Misma fila si 1 ordenante y 1 actuante; si no, ordenantes y luego actuantes. */
export function buildFirmasTable(input: FirmasTableInput): Table {
  const ordenanteBlocks = input.ordenantes
    .map(ordenanteSignatureParagraphs)
    .filter((b) => b.length > 0)
  const actuanteBlocks: Paragraph[][] = [profesionalSignatureParagraphs(input.principal)]
  if (input.segundo) actuanteBlocks.push(profesionalSignatureParagraphs(input.segundo))

  const rows: TableRow[] = []
  const pairOrdenanteActuante = ordenanteBlocks.length === 1 && actuanteBlocks.length === 1

  if (pairOrdenanteActuante) {
    rows.push(signaturePairRow(ordenanteBlocks[0]!, actuanteBlocks[0]!))
  } else {
    for (let i = 0; i < ordenanteBlocks.length; i += 2) {
      rows.push(signaturePairRow(ordenanteBlocks[i]!, ordenanteBlocks[i + 1] ?? []))
    }
    for (let i = 0; i < actuanteBlocks.length; i += 2) {
      rows.push(signaturePairRow(actuanteBlocks[i]!, actuanteBlocks[i + 1] ?? []))
    }
  }

  const margins = expedienteDocxMarginsTwip()
  const contentWidth = EXPEDIENTE_DOCX_PAGE_SIZE_TWIP.width - margins.left - margins.right
  const blockLeftTwip = BODY_PARAGRAPH_INDENT.left
  const tableWidth = contentWidth - blockLeftTwip
  const colGap = Math.round(tableWidth * FIRMA_GAP_FRAC)
  const colFirma = Math.floor((tableWidth - colGap) / 2)
  const colFirmaR = tableWidth - colGap - colFirma

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: [colFirma, colGap, colFirmaR],
    indent: { size: blockLeftTwip, type: WidthType.DXA },
    borders: TableBorders.NONE,
    rows,
  })
}

export { cardinalFromRumbo, formatCardinalesColindantes } from './cardinales'
