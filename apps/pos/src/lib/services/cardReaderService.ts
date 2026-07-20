/**
 * Card reader service
 * Supports magnetic stripe card readers (act as keyboards)
 * and EMV chip card readers via WebUSB/Serial
 */

export interface CardData {
  track1?: string // Track 1 data
  track2?: string // Track 2 data
  track3?: string // Track 3 data
  cardNumber?: string // Extracted card number
  expiryDate?: string // MM/YY format
  cardholderName?: string
  timestamp: Date
}

/**
 * Parse magnetic stripe data from keyboard input
 * Card readers typically send data in format: %B...^...? or ;...?
 */
export function parseMagneticStripeData(input: string): CardData | null {
  const data: CardData = {
    timestamp: new Date(),
  }

  // Track 2 format: ;1234567890123456=YYMM...
  if (input.startsWith(';') && input.includes('=')) {
    const track2Match = input.match(/;(\d+)=(\d{4})(.+)/)
    if (track2Match) {
      data.track2 = input
      data.cardNumber = track2Match[1]
      const expiryYY = track2Match[2].substring(0, 2)
      const expiryMM = track2Match[2].substring(2, 4)
      data.expiryDate = `${expiryMM}/${expiryYY}`
      return data
    }
  }

  // Track 1 format: %B...^...
  if (input.startsWith('%B')) {
    const track1Match = input.match(/^%B(\d+)\^([A-Z\s]+)\^(\d{4})/)
    if (track1Match) {
      data.track1 = input
      data.cardNumber = track1Match[1]
      data.cardholderName = track1Match[2].trim()
      const expiryYY = track1Match[3].substring(0, 2)
      const expiryMM = track1Match[3].substring(2, 4)
      data.expiryDate = `${expiryMM}/${expiryYY}`
      return data
    }
  }

  return null
}

/**
 * Listen for card swipe from magnetic stripe reader
 */
export class CardReader {
  private buffer: string = ''
  private timeout: NodeJS.Timeout | null = null
  private readonly TIMEOUT_MS = 200 // Timeout between characters

  constructor(
    private onCardRead: (data: CardData) => void
  ) {}

  start(element: HTMLElement): void {
    element.addEventListener('keydown', this.handleKeyDown)
    element.setAttribute('tabindex', '0')
    element.focus()
  }

  stop(element: HTMLElement): void {
    element.removeEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Clear timeout if exists
    if (this.timeout) {
      clearTimeout(this.timeout)
    }

    // If Enter key, process card data
    if (event.key === 'Enter' && this.buffer.length > 0) {
      event.preventDefault()
      const cardData = parseMagneticStripeData(this.buffer)
      if (cardData) {
        this.onCardRead(cardData)
      }
      this.buffer = ''
      return
    }

    // Add character to buffer
    this.buffer += event.key

    // Set timeout to clear buffer if no more input
    this.timeout = setTimeout(() => {
      this.buffer = ''
    }, this.TIMEOUT_MS)
  }
}

/**
 * Read EMV chip card via WebUSB/Serial (placeholder)
 * Actual implementation depends on specific card reader model
 */
export async function readEMVChipCard(): Promise<CardData | null> {
  try {
    // Note: EMV chip reading requires specific hardware and protocols
    // This is a placeholder for future implementation
    console.warn('EMV chip reading not fully implemented')
    return null
  } catch (error) {
    console.error('Failed to read EMV chip:', error)
    return null
  }
}

