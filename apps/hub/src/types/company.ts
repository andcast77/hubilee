import type { CompanyModules } from "@hubilee/contracts";

export type Company = {
  id: string;
  name: string;
  parentId: string | null;
  ownerUserId: string | null;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  } | null;
  /** @deprecated Use modules.hr */
  hrEnabled?: boolean;
  /** @deprecated Use modules.pos */
  posEnabled?: boolean;
  /** @deprecated Use modules.techservices */
  technicalServicesEnabled?: boolean;
  modules?: CompanyModules;
  isActive: boolean;
  logo: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyStats = {
  totalMembers: number;
  ownerCount: number;
  adminCount: number;
  userCount: number;
  lastMember: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    membershipRole: string;
    createdAt: string;
  } | null;
};

export type CompanyMember = {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  membershipRole: "OWNER" | "ADMIN" | "USER";
  createdAt: string;
  storeIds?: string[];
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  companyId?: string;
  membershipRole?: "OWNER" | "ADMIN" | "USER";
  isSuperuser?: boolean;
  company?: { id: string; name: string; modules: CompanyModules };
};

export type UpdateCompanyInput = {
  name?: string;
  hrEnabled?: boolean;
  posEnabled?: boolean;
  technicalServicesEnabled?: boolean;
  logo?: string;
  taxId?: string;
  address?: string;
  phone?: string;
};
// Re-export for consumers
export type { CompanyModules } from "@hubilee/contracts";

/** Resolve whether a module is enabled (supports both modules.* and legacy hrEnabled etc.) */
export function isModuleEnabled(
  company: Company,
  module: "hr" | "pos" | "techservices"
): boolean {
  const m = company.modules;
  if (m) return module === "hr" ? m.hr : module === "pos" ? m.pos : m.techservices;
  if (module === "hr") return company.hrEnabled ?? false;
  if (module === "pos") return company.posEnabled ?? false;
  return company.technicalServicesEnabled ?? false;
}
