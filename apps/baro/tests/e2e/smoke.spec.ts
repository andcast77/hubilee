import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('home page loads successfully', async ({ page }) => {
    const resp = await page.goto('/')
    expect(resp?.ok()).toBe(true)
  })

  test('login page loads successfully', async ({ page }) => {
    const resp = await page.goto('/login')
    expect(resp?.ok()).toBe(true)
  })
})
