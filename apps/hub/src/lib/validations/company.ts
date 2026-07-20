import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres")
    .optional(),
  workifyEnabled: z.boolean().optional(),
  posEnabled: z.boolean().optional(),
  technicalServicesEnabled: z.boolean().optional(),
});

export const companyFiscalSchema = z.object({
  taxId: z
    .string()
    .max(20, "El RFC no puede exceder 20 caracteres")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(255, "La dirección no puede exceder 255 caracteres")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .optional()
    .or(z.literal("")),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanyFiscalInput = z.infer<typeof companyFiscalSchema>;
