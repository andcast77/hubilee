export type CompanyModules = {
  hr: boolean
  pos: boolean
  tech: boolean
}

export type CompanyRow = {
  id: string
  name: string
  modules: CompanyModules
  membershipRole?: string | null
}
