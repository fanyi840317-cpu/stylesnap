/**
 * License Manager — StyleSnap
 * Free: 20 extractions/day   |   Pro: unlimited ($29 one-time)
 *
 * Uses Dodo Payments for checkout and verification.
 * Proxy API: https://stylesnap-proxy.vercel.app
 */
import type { LicenseStatus, UserSettings } from '@/shared/types'
import { DEFAULT_SETTINGS } from '@/shared/types'
import { STORAGE_KEYS, DAILY_FREE_LIMIT } from '@/shared/constants'

const DODO_API_KEY = 'FpqFn-UIKyng7u87.BaFztBGHO8g5rjTbFdN5i31JIh_MaYEw9ELf3jSewqiSzkyj'
const DODO_PRODUCT_ID = 'pdt_0Nd9xgoxK3W2IJCiietgg' // using the test product id from the account

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
  const res = await fetch(`https://test.dodopayments.com/checkouts`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DODO_API_KEY}`
    },
    body: JSON.stringify({ 
      customer: { email: email || '' },
      product_cart: [{ product_id: DODO_PRODUCT_ID, quantity: 1 }],
      return_url: "https://stylesnap.dev/success"
    }),
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error)
  if (!data.checkout_url) throw new Error('No checkout URL returned from Dodo Payments')
  return data.checkout_url
}

// ─── Activation (Dodo Payments) ──────────────────────────────────────────────

/**
 * Verifies a purchase by email against the Dodo Payments API.
 * Returns `true` on success, `false` if no purchase found.
 */
export async function activateLicense(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(normalized)) return false

  try {
    const res = await fetch(`https://test.dodopayments.com/payments?limit=100`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${DODO_API_KEY}`
      }
    })

    const data = await res.json()
    // Find a succeeded payment for this email
    const validPayment = data.items?.find((p: any) => 
      p.customer?.email?.toLowerCase() === normalized && p.status === 'succeeded'
    )

    if (!validPayment) return false

    // Store license with email
    const payload: Partial<LicenseStatus> = {
      isPro:      true,
      dailyUsed:  0,
      dailyLimit: Infinity,
      email:      normalized,
      licenseKey: validPayment.payment_id || '',
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
