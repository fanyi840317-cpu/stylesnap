/**
 * Content Script
 * Injected into every page. Handles hover detection, CSS extraction,
 * element highlighting, and design token scanning.
 */
import { parseElement, extractComponentCSS, extractComponentHTML } from '@/lib/css-extractor'
import { extractDesignTokens } from '@/lib/token-extractor'
import { collectAnnotatableElements } from '@/lib/annotator'
import type { ParsedCSS } from '@/shared/types'

// ─── State ────────────────────────────────────────────────────────────

let isActive = false
let lastHighlighted: Element | null = null
const OVERLAY_ID = 'stylesnap-overlay'
const HIGHLIGHT_CLASS = 'stylesnap-highlight'

// ─── Overlay UI ───────────────────────────────────────────────────────

function getOrCreateOverlay(): HTMLElement {
  let overlay = document.getElementById(OVERLAY_ID)
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.setAttribute('data-stylesnap', 'true')
    document.body.appendChild(overlay)
  }
  return overlay
}

function showOverlay(el: Element, parsedCSS: ParsedCSS) {
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

  // Position overlay
  const scrollY = window.scrollY
  const scrollX = window.scrollX
  let top = rect.bottom + scrollY + 4
  let left = rect.left + scrollX

  if (rect.bottom + 150 > window.innerHeight) {
    top = rect.top + scrollY - 4
    overlay.style.transform = 'translateY(-100%)'
  } else {
    overlay.style.transform = 'translateY(0)'
  }

  const maxLeft = window.innerWidth - 320 + scrollX
  left = Math.max(8, Math.min(left, maxLeft))

  overlay.style.top = `${top}px`
  overlay.style.left = `${left}px`
  overlay.style.display = 'block'
}

function hideOverlay() {
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) overlay.style.display = 'none'
}

function highlightElement(el: Element) {
  removeHighlight()
  el.classList.add(HIGHLIGHT_CLASS)
  lastHighlighted = el
}

function removeHighlight() {
  if (lastHighlighted) {
    lastHighlighted.classList.remove(HIGHLIGHT_CLASS)
    lastHighlighted = null
  }
}

// ─── Event handlers ───────────────────────────────────────────────────

function onMouseMove(e: MouseEvent) {
  if (!isActive) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el.closest('[data-stylesnap]')) return
  if (el === lastHighlighted) return

  highlightElement(el)
  const parsedCSS = parseElement(el)
  showOverlay(el, parsedCSS)

  chrome.runtime.sendMessage({
    type: 'ELEMENT_HOVERED',
    payload: {
      parsedCSS,
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      classList: Array.from(el.classList).filter(c => !c.startsWith('stylesnap-')),
      rect: { width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top), left: Math.round(el.getBoundingClientRect().left) },
    },
  }).catch(() => {})
}

function onClick(e: MouseEvent) {
  if (!isActive) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el.closest('[data-stylesnap]')) return

  e.preventDefault()
  e.stopPropagation()

  const parsedCSS = parseElement(el)
  const componentHTML = extractComponentHTML(el, 3)
  const componentCSS = extractComponentCSS(el, 3)

  chrome.runtime.sendMessage({
    type: 'ELEMENT_CLICKED',
    payload: {
      parsedCSS,
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      classList: Array.from(el.classList).filter(c => !c.startsWith('stylesnap-')),
      rect: { width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top), left: Math.round(el.getBoundingClientRect().left) },
      componentHTML,
      componentCSS,
    },
  }).catch(() => {})
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isActive) {
    disableInspector()
    chrome.runtime.sendMessage({ type: 'DISABLE_INSPECTOR' }).catch(() => {})
  }
}

// ─── Inspector control ────────────────────────────────────────────────

function enableInspector() {
  if (isActive) return
  isActive = true
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)
}

function disableInspector() {
  isActive = false
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('keydown', onKeyDown, true)
  removeHighlight()
  hideOverlay()
}

// ─── Message handling ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }, _sender, sendResponse) => {
  switch (message.type) {
    case 'INIT_INSPECTOR':
      enableInspector()
      sendResponse({ ok: true })
      break

    case 'DISABLE_INSPECTOR':
      disableInspector()
      sendResponse({ ok: true })
      break

    case 'EDIT_CSS': {
      const { selector, property, value } = message.payload as { selector: string; property: string; value: string }
      const targets = document.querySelectorAll(selector)
      targets.forEach(el => {
        (el as HTMLElement).style.setProperty(property, value)
      })
      sendResponse({ ok: true })
      break
    }

    case 'EXTRACT_TOKENS': {
      try {
        const tokens = extractDesignTokens()
        sendResponse({ tokens })
      } catch (e: unknown) {
        sendResponse({ error: (e as Error).message })
      }
      break
    }

    case 'COLLECT_ELEMENTS': {
      try {
        const elements = collectAnnotatableElements()
        sendResponse({ elements })
      } catch (e: unknown) {
        sendResponse({ error: (e as Error).message })
      }
      break
    }

    default:
      sendResponse({ error: 'Unknown message type' })
  }
  return true // keep channel open for async responses
})
