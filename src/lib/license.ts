/**
 * License Manager — StyleSnap
 * Free: 20 extractions/day   |   Pro: unlimited ($29 one-time)
 *
 * Uses Dodo Payments for checkout and verification.
 * Proxy API: https://stylesnap-proxy.vercel.app
 */
import type { LicenseStatus, UserSettings } from '@/shared/types'
import { DEFAULT_SETTINGS } from '@/shared/types'
import { STORAGE_KEYS, DAILY_FREE_LIMIT, PROXY_BASE_URL } from '@/shared/constants'

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.LICENSE,
    STORAGE_KEYS.USAGE,
  ])

  const stored = data[STORAGE_KEYS.LICENSE] as Partial<LicenseStatus> | undefined
  const usageRec = data[STORAGE_KEYS.USAGE] as { date: string; count: number } | undefined

  const today     = new Date().toISOString().slice(0, 10)
  const dailyUsed = usageRec?.date === today ? (usageRec.count ?? 0) : 0

  if (stored?.isPro) {
    return {
      isPro:      true,
      dailyUsed,
      dailyLimit: Infinity,
      email:      stored.email,
      licenseKey: stored.licenseKey,
    }
  }

  return { isPro: false, dailyUsed, dailyLimit: DAILY_FREE_LIMIT }
}

// ─── Usage tracking ───────────────────────────────────────────────────────────

/** Returns false when free quota exceeded */
export async function recordUsage(): Promise<boolean> {
  const status = await getLicenseStatus()
  if (status.isPro) return true
  if (status.dailyUsed >= status.dailyLimit) return false

  const today = new Date().toISOString().slice(0, 10)
  await chrome.storage.local.set({
    [STORAGE_KEYS.USAGE]: { date: today, count: status.dailyUsed + 1 },
  })
  return true
}

// ─── Checkout (Dodo Payments) ────────────────────────────────────────────────

/**
 * Creates a Dodo Payments checkout session and returns the URL.
 * The user completes payment on the Dodo checkout page.
 */
export async function createCheckout(email?: string): Promise<string> {
  // Since we cannot securely store Dodo API keys in client-side code (Chrome Extension),
  // we redirect the user to a secure hosted proxy endpoint or payment link.
  // Using a static Dodo Payment Link here is the safest and easiest way for client-side apps.
  // NOTE: You should create a Payment Link in Dodo Dashboard and replace this URL.
  const paymentLinkUrl = 'https://test.checkout.dodopayments.com/buy/pdt_0Nd9xgoxK3W2IJCiietgg'
  
  // Optionally append the email as a query parameter if Dodo supports pre-filling
  if (email) {
    return `${paymentLinkUrl}?email=${encodeURIComponent(email)}`
  }
  return paymentLinkUrl
}

// ─── Activation (Dodo Payments) ──────────────────────────────────────────────

/**
 * Verifies a purchase by email.
 * WARNING: Client-side verification is inherently insecure without a backend proxy.
 * For a real production app, this MUST call your own backend server (like the Vercel proxy)
 * which then securely calls Dodo Payments API using your secret API key.
 */
export async function activateLicense(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(normalized)) return false

  try {
    // ⚠️ INSECURE MOCK FOR DEMONSTRATION ONLY ⚠️
    // Since we removed the API key from the client, we cannot directly query Dodo API.
    // In production, uncomment the PROXY_BASE_URL fetch block below.
    console.log("Verify endpoint would be:", `${PROXY_BASE_URL}/api/verify`);
    
    /*
    const res = await fetch(`${PROXY_BASE_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized }),
    })
    const data = await res.json()
    if (!data.valid) return false
    */

    // TEMPORARY: For testing without a backend, we will accept any email
    // containing the word "pro" or "test" as a valid payment.
    const isValidMock = normalized.includes('pro') || normalized.includes('test')
    if (!isValidMock) {
      // Simulate failure if it doesn't match mock criteria
      return false
    }

    // Store license with email
    const payload: Partial<LicenseStatus> = {
      isPro:      true,
      dailyUsed:  0,
      dailyLimit: Infinity,
      email:      normalized,
      licenseKey: `mock_pay_${Date.now()}`,
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.LICENSE]: payload })
    return true
  } catch {
    return false
  }
}

export async function deactivateLicense(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.LICENSE)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] ?? {}) }
}

export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings()
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: { ...current, ...settings },
  })
}
