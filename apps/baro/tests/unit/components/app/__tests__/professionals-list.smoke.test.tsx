import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect, describe, afterEach } from 'vitest'
import { ProfessionalsList } from '@/components/app/professionals-list'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { ApiProfessionalListItem } from '@/components/app/professional-profile-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

vi.mock('@/components/app/account-context', () => ({
  useAccount: () => ({
    user: null,
    profile: null,
    loading: false,
    error: null,
    lastMeStatus: 200,
    refresh: vi.fn(),
  }),
}))

afterEach(() => cleanup())

const mockPro: ApiProfessionalListItem = {
  id: '1',
  displayName: 'Ana García',
  professionalTitle: 'AGRIMENSOR',
  titleGrammarGender: 'FEMENINO',
  locality: 'San Juan',
  addressLine1: 'Calle 1',
  createdAt: '',
  updatedAt: '',
  active: true,
  registrations: [],
}

describe('ProfessionalsList — shadcn Table + AlertDialog migration', () => {
  it('renders table with shadcn primitives', () => {
    render(
      <TooltipProvider>
        <ProfessionalsList professionals={[mockPro]} titularId={null} />
      </TooltipProvider>
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
  })

  it('click Eliminar opens AlertDialog without calling fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response)
    render(
      <TooltipProvider>
        <ProfessionalsList professionals={[mockPro]} titularId="otro-id" />
      </TooltipProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: /eliminar/i }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
