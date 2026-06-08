import { redirect } from 'next/navigation'

const HUB_URL = (process.env.NEXT_PUBLIC_HUB_URL || 'http://localhost:3001').replace(/\/$/, '')

/** Registration is via Hub per baro-auth-integration spec. */
export default function RegisterPage() {
  redirect(`${HUB_URL}/register`)
}
