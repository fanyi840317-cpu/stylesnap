/**
 * Overlay Module
 * Overlay UI shown when hovering/clicking elements
 */
import type { ParsedCSS } from '@/shared/types'
import { OVERLAY_ID } from './state'

export function getOrCreateOverlay(): HTMLElement {
  let overlay = document.getElementById(OVERLAY_ID)
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.setAttribute('data-stylesnap', 'true')
    chrome.storage.local.get(['language'], (res) => {
      overlay!.setAttribute('data-lang', res.language || 'en')
    })
    ;(document.documentElement || document.body).appendChild(overlay)
  }
  return overlay
}

export function showOverlay(el: Element, parsedCSS: ParsedCSS): void {
  const overlay = getOrCreateOverlay()
  const rect = el.getBoundingClientRect()

  const { styles, tailwindClasses = [], tailwindMatchRate = 0 } = parsedCSS
  const tailwindStr = tailwindClasses.slice(0, 8).join(' ') + (tailwindClasses.length > 8 ? ' …' : '')
  const matchPct = Math.round(tailwindMatchRate * 100)

  const cssPreview = Object.entries(styles)
    .slice(0, 8)
    .map(([k, v]) => `<span class="ss-prop">${k}:</span> <span class="ss-val">${v}</span>`)
    .join('\n')

  overlay.innerHTML = `
    <div class="ss-header">
      <span class="ss-tag">${el.tagName.toLowerCase()}</span>
      <span class="ss-dim">${Math.round(rect.width)}×${Math.round(rect.height)}</span>
      <span class="ss-match">TW ${matchPct}%</span>
    </div>
    ${tailwindStr ? `<div class="ss-tw">${tailwindStr}</div>` : ''}
    <pre class="ss-css">${cssPreview}</pre>
  `

  overlay.style.setProperty('display', 'block', 'important')
  const overlayRect = overlay.getBoundingClientRect()
  const overlayWidth = overlayRect.width || 320
  const overlayHeight = overlayRect.height || 150

  let top = rect.bottom + 4
  let left = rect.left
  overlay.style.setProperty('transform', 'none', 'important')

  if (rect.bottom + overlayHeight + 10 > window.innerHeight) {
    top = rect.top - overlayHeight - 4
    if (top < 0) top = window.innerHeight - overlayHeight - 10
  }

  const maxLeft = window.innerWidth - overlayWidth - 10
  left = Math.max(10, Math.min(left, maxLeft))

  overlay.style.setProperty('top', `${top}px`, 'important')
  overlay.style.setProperty('left', `${left}px`, 'important')
}

export function hideOverlay(): void {
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) overlay.style.setProperty('display', 'none', 'important')
}
