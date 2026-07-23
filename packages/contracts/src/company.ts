export type CompanyModules = {
  hr: boolean
  pos: boolean
  tech: boolean
}

export type BusinessType = 'VERDULERIA' | 'KIOSCO' | 'ELECTRONICA' | 'ROPA' | 'ACCESORIOS' | 'OTRO'

export type CompanyRow = {
  id: string
  name: string
  modules: CompanyModules
  membershipRole?: string | null
  businessType?: BusinessType | null
}
