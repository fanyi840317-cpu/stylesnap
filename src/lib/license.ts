/**
 * License Manager — StyleSnap
 * Free: 20 extractions/day   |   Pro: unlimited ($29 one-time)
 */
import type { LicenseStatus, UserSettings } from '@/shared/types'
import { DEFAULT_SETTINGS } from '@/shared/types'
import { STORAGE_KEYS, DAILY_FREE_LIMIT } from '@/shared/constants'

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

// ─── Activation ───────────────────────────────────────────────────────────────

/**
 * Validates and stores a license key.
 * Returns `true` on success, `false` on invalid format.
 * 
 * TODO: Replace simple format check with Creem.io API call before launch.
 * Endpoint: POST https://api.creem.io/v1/licenses/validate
 * Body: { license_key: string, product_id: string }
 */
export async function activateLicense(key: string): Promise<boolean> {
  const normalized = key.trim().toUpperCase()
  const pattern    = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/
  if (!pattern.test(normalized)) return false

  const payload: Partial<LicenseStatus> = {
    isPro:      true,
    dailyUsed:  0,
    dailyLimit: Infinity,
    licenseKey: normalized,
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.LICENSE]: payload })
  return true
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
