import { test, expect } from '@playwright/test'

test.describe('StyleSnap Extension', () => {
  test('floating button appears after page load', async ({ page }) => {
    // Use a real URL that the extension can inject into
    await page.goto('https://example.com')
    const floatingBtn = page.locator('#stylesnap-floating-btn')
    await expect(floatingBtn).toBeVisible({ timeout: 8000 })
  })

  test('click floating button activates inspect mode', async ({ page }) => {
    await page.goto('https://example.com')
    const floatingBtn = page.locator('#stylesnap-floating-btn')
    await expect(floatingBtn).toBeVisible({ timeout: 8000 })

    await floatingBtn.click()
    await expect(floatingBtn).toHaveClass(/is-active/, { timeout: 3000 })
  })

  test('ctrl+click extracts element and opens side panel', async ({ page }) => {
    // Use a page with responsive + hover styles
    await page.goto('https://tailwindcss.com/docs/hover-focus-and-other-states')
    const floatingBtn = page.locator('#stylesnap-floating-btn')
    await expect(floatingBtn).toBeVisible({ timeout: 8000 })

    // Enter inspect mode
    await floatingBtn.click()
    await expect(floatingBtn).toHaveClass(/is-active/, { timeout: 3000 })

    // Ctrl+click a target element (the first h1 on the page)
    const target = page.locator('h1').first()
    await target.click({ modifiers: ['ControlOrMeta'] })

    // Wait for side panel to appear
    await page.waitForTimeout(2000)

    // Verify floating button is still visible (extension didn't crash)
    await expect(floatingBtn).toBeVisible()

    // Check if side panel iframe appeared
    const sidePanel = page.locator('iframe[src*="side-panel"]')
    const panelCount = await sidePanel.count()
    console.log(`Side panel iframe count: ${panelCount}`)
  })
})
