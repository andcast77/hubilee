/**
 * Referencias y checklist para datos de presentación profesional (topografía y mediciones, Argentina).
 * La normativa aplicable depende de la jurisdicción y del organismo receptor del plano; contrastar siempre con el colegio provincial y el catastro/municipio correspondiente.
 */
export const PROFESSIONAL_LEGAL_REFERENCES = {
  colegioAgrimensoresSanJuan: 'http://www.agrimensoressanjuan.org.ar/',
  cpaNacional: 'https://www.cpa.org.ar/preguntas-frecuentes.php',
  tramitesProvinciaSanJuan: 'https://tramite.sanjuan.gov.ar/',
} as const

/** Datos habitualmente exigidos en aclaración de firma / membrete de planos (ver manual del organismo receptor). */
export const PLAN_MEMBRETE_CHECKLIST = [
  'Nombre y apellido completos',
  'Título: Agrimensor o Ingeniero Agrimensor',
  'Número de matrícula y jurisdicción del colegio o consejo',
  'Domicilio profesional completo (calle, localidad, provincia)',
] as const

/** Datos útiles para contacto comercial, obra o trámites (complementan el membrete). */
export const CONTACTO_PROFESIONAL_CHECKLIST = [
  'Teléfono y/o WhatsApp profesional',
  'Correo de contacto profesional (puede diferirse del email de acceso a la cuenta)',
  'CUIT / datos fiscales para facturación (dato sensible; no exponer en vistas públicas)',
] as const

/** Texto breve para mostrar en formularios de perfil (no sustituye asesoramiento legal). */
export const PROFILE_LEGAL_DISCLAIMER =
  'Los requisitos exactos de presentación dependen del Colegio de la jurisdicción y del organismo que recibe el plano (catastro, municipio, etc.). Verificá la normativa vigente antes de presentar documentación técnica.'
