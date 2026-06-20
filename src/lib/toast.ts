/**
 * Toast notification helper
 * Uses chrome.notifications API (requires "notifications" permission in manifest.json)
 */

export interface ToastOptions {
  title?: string
  message: string
  type?: 'basic' | 'success' | 'warning' | 'error'
  duration?: number // ms, default 4000
}

const ICON_MAP = {
  basic: 'icons/icon48.png',
  success: 'icons/icon48.png',
  warning: 'icons/icon48.png',
  error: 'icons/icon48.png',
}

export function showToast(opts: ToastOptions): void {
  const { title = 'StyleSnap', message, type = 'basic', duration = 4000 } = opts

  const notificationId = `stylesnap-toast-${Date.now()}`

  chrome.notifications.create(
    notificationId,
    {
      type: 'basic',
      iconUrl: ICON_MAP[type] || ICON_MAP.basic,
      title,
      message,
    },
    () => {
      // Auto-clear after duration
      setTimeout(() => {
        chrome.notifications.clear(notificationId)
      }, duration)
    }
  )
}

// ─── Convenience helpers ──────────────────────────────
export function showSuccess(message: string): void {
  showToast({ type: 'success', message })
}

export function showError(message: string): void {
  showToast({ type: 'error', message, duration: 6000 })
}

export function showWarning(message: string): void {
  showToast({ type: 'warning', message })
}
