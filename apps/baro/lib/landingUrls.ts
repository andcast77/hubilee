export function getHubUrl(): string {
  return (process.env.NEXT_PUBLIC_HUB_URL ?? 'http://localhost:3001').replace(/\/$/, '')
}

export function hubForgotPasswordUrl(): string {
  return `${getHubUrl()}/forgot-password`
}

export function hubRegisterUrl(query = ''): string {
  const base = `${getHubUrl()}/register`
  return query ? `${base}?${query}` : base
}
