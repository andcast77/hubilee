import { config as loadEnv } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { resolve } from 'node:path'
import { Pool } from 'pg'

const root = process.cwd()
loadEnv({ path: resolve(root, '.env') })
loadEnv({ path: resolve(root, '.env.local'), override: true })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is required for seed')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const titularData = {
  professionalTitle: 'INGENIERO_AGRIMENSOR',
  displayName: 'Usuario Desarrollo Agrimensor',
  dni: '30123456',
  sexo: 'Masculino',
  phone: '2644000000',
  whatsapp: null,
  professionalEmail: 'pro.dev@baro.local',
  addressLine1: 'San Luis 566 Oeste',
  addressLine2: null,
  locality: 'Capital',
  province: 'San Juan',
  postalCode: null,
  websiteUrl: null,
  cuit: '20-12345678-9',
  registrations: {
    deleteMany: {},
    create: [
      {
        licenseNumber: 'DEV-0001',
        jurisdiction: 'San Juan',
        bodyName: 'Colegio de Profesionales de la Agrimensura de San Juan',
      },
    ],
  },
}

async function main() {
  const email = 'dev@baro.local'
  const password = 'devpassword123'
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
    select: { id: true, titularProfessionalId: true },
  })

  if (user.titularProfessionalId) {
    await prisma.professional.update({
      where: { id: user.titularProfessionalId },
      data: {
        professionalTitle: titularData.professionalTitle,
        displayName: titularData.displayName,
        dni: titularData.dni,
        sexo: titularData.sexo,
        phone: titularData.phone,
        whatsapp: titularData.whatsapp,
        professionalEmail: titularData.professionalEmail,
        addressLine1: titularData.addressLine1,
        addressLine2: titularData.addressLine2,
        locality: titularData.locality,
        province: titularData.province,
        postalCode: titularData.postalCode,
        websiteUrl: titularData.websiteUrl,
        cuit: titularData.cuit,
        registrations: titularData.registrations,
      },
    })
  } else {
    const created = await prisma.professional.create({
      data: {
        accountOwnerId: user.id,
        professionalTitle: titularData.professionalTitle,
        displayName: titularData.displayName,
        dni: titularData.dni,
        sexo: titularData.sexo,
        phone: titularData.phone,
        whatsapp: titularData.whatsapp,
        professionalEmail: titularData.professionalEmail,
        addressLine1: titularData.addressLine1,
        addressLine2: titularData.addressLine2,
        locality: titularData.locality,
        province: titularData.province,
        postalCode: titularData.postalCode,
        websiteUrl: titularData.websiteUrl,
        cuit: titularData.cuit,
        registrations: {
          create: titularData.registrations.create,
        },
      },
    })
    await prisma.user.update({
      where: { id: user.id },
      data: { titularProfessionalId: created.id },
    })
  }

  console.info(`Seed: upserted user ${email} (password: ${password}) + profesional titular`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
