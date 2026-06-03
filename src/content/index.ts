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
let lockedElement: Element | null = null
const OVERLAY_ID = 'stylesnap-overlay'
const HIGHLIGHT_CLASS = 'stylesnap-highlight'
const LOCKED_CLASS = 'stylesnap-locked'

// ─── Overlay UI ───────────────────────────────────────────────────────

function getOrCreateOverlay(): HTMLElement {
  let overlay = document.getElementById(OVERLAY_ID)
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = OVERLAY_ID
    overlay.setAttribute('data-stylesnap', 'true')
    
    // Set initial language attribute
    chrome.storage.local.get(['language'], (res) => {
      overlay!.setAttribute('data-lang', res.language || 'en')
    })
    
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
  if (lockedElement && el !== lockedElement) return
  removeHighlight()
  el.classList.add(HIGHLIGHT_CLASS)
  lastHighlighted = el
}

function removeHighlight() {
  if (lastHighlighted && lastHighlighted !== lockedElement) {
    lastHighlighted.classList.remove(HIGHLIGHT_CLASS)
    lastHighlighted = null
  }
}

function lockElement(el: Element) {
  if (lockedElement) {
    lockedElement.classList.remove(LOCKED_CLASS)
  }
  lockedElement = el
  el.classList.add(LOCKED_CLASS)
  el.classList.remove(HIGHLIGHT_CLASS)
  lastHighlighted = null

  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) {
    overlay.classList.add('ss-interactive')
  }
}

function unlockElement() {
  if (lockedElement) {
    lockedElement.classList.remove(LOCKED_CLASS)
    lockedElement = null
  }
  
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) {
    overlay.classList.remove('ss-interactive')
  }
}

// ─── Event handlers ───────────────────────────────────────────────────

function onMouseMove(e: MouseEvent) {
  if (!isActive || lockedElement) return
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
  
  // 如果点击的是 overlay 内部，不要触发解锁或新元素的锁定
  if (el && el.closest('#' + OVERLAY_ID)) {
    return
  }

  // 点击了网页中的空白处或者扩展自身的UI（悬浮按钮）
  if (!el || el.closest('[data-stylesnap]')) {
    if (lockedElement) {
      unlockElement()
      chrome.runtime.sendMessage({ type: 'ELEMENT_UNLOCKED' }).catch(() => {})
      hideOverlay()
    }
    return
  }

  e.preventDefault()
  e.stopPropagation()

  if (lockedElement === el) {
    // 再次点击已锁定的元素，取消锁定
    unlockElement()
    chrome.runtime.sendMessage({ type: 'ELEMENT_UNLOCKED' }).catch(() => {})
    // 手动触发一次 hover 以更新高亮和信息框
    onMouseMove(e)
    return
  }

  // 锁定该元素
  lockElement(el)

  const parsedCSS = parseElement(el)
  const componentHTML = extractComponentHTML(el, 3)
  const componentCSS = extractComponentCSS(el, 3)

  showOverlay(el, parsedCSS)

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
    e.preventDefault()
    e.stopPropagation()
    
    if (lockedElement) {
      // 第一次按 ESC 解除锁定
      unlockElement()
      chrome.runtime.sendMessage({ type: 'ELEMENT_UNLOCKED' }).catch(() => {})
      hideOverlay()
    } else {
      // 第二次按 ESC 退出审查模式
      disableInspector()
      chrome.runtime.sendMessage({ type: 'DISABLE_INSPECTOR' }).catch(() => {})
    }
  }
}

// ─── Inspector control ────────────────────────────────────────────────

function enableInspector() {
  if (isActive) return
  isActive = true
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)

  const btn = document.getElementById(FLOATING_BTN_ID)
  if (btn) {
    chrome.storage.local.get(['language'], (res) => {
      const isEn = res.language === 'en'
      const stopText = isEn ? 'Stop Inspecting' : '停止审查'
      
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)'
      btn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)'
      btn.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; font-family:system-ui, sans-serif; font-size:14px; font-weight:600;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
          <span>${stopText}</span>
        </div>
      `
    })
  }
}

function disableInspector() {
  isActive = false
  document.removeEventListener('mousemove', onMouseMove, true)
  document.removeEventListener('click', onClick, true)
  document.removeEventListener('keydown', onKeyDown, true)
  unlockElement()
  removeHighlight()
  hideOverlay()

  const btn = document.getElementById(FLOATING_BTN_ID)
  if (btn) {
    chrome.storage.local.get(['language'], (res) => {
      const isEn = res.language === 'en'
      const startText = isEn ? 'Inspect Style' : '审查样式'
      
      btn.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      btn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)'
      btn.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; font-family:system-ui, sans-serif; font-size:14px; font-weight:600;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21 21-4.35-4.35" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <span>${startText}</span>
        </div>
      `
    })
  }
}

// ─── Floating Button UI ────────────────────────────────────────────────

const FLOATING_BTN_ID = 'stylesnap-floating-btn'

function initFloatingButton() {
  if (document.getElementById(FLOATING_BTN_ID)) return

  const btn = document.createElement('button')
  btn.id = FLOATING_BTN_ID
  btn.setAttribute('data-stylesnap', 'true')
  
  // Try to load user's preferred language for the floating button
  chrome.storage.local.get(['language'], (res) => {
    const isEn = res.language === 'en'
    const startText = isEn ? 'Inspect Style' : '审查样式'
    
    btn.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px; font-family:system-ui, sans-serif; font-size:14px; font-weight:600;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21 21-4.35-4.35" />
          <circle cx="11" cy="11" r="8" />
        </svg>
        <span>${startText}</span>
      </div>
    `
  })
  
  // Style the button directly to ensure it works regardless of external CSS
  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: 'auto',
    padding: '0 16px',
    height: '44px',
    borderRadius: '22px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '2147483647',
    transition: 'transform 0.2s, filter 0.2s',
    userSelect: 'none'
  })

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.05) translateY(-2px)'
    btn.style.filter = 'brightness(1.1)'
  })
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1) translateY(0)'
    btn.style.filter = 'brightness(1)'
  })

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Toggle inspector
    if (isActive) {
      disableInspector()
      chrome.runtime.sendMessage({ type: 'DISABLE_INSPECTOR' }).catch(() => {})
    } else {
      enableInspector()
      chrome.runtime.sendMessage({ type: 'INIT_INSPECTOR' }).catch(() => {})
      // Try to open side panel
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }).catch(() => {})
    }
  })

  document.body.appendChild(btn)
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFloatingButton)
} else {
  initFloatingButton()
}

// ─── Message handling ─────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.language) {
    const lang = changes.language.newValue
    // Update floating button text
    if (isActive) {
      enableInspector() // Re-apply active state UI
    } else {
      disableInspector() // Re-apply inactive state UI
    }
    // Update overlay language
    const overlay = document.getElementById(OVERLAY_ID)
    if (overlay) {
      overlay.setAttribute('data-lang', lang || 'en')
    }
  }
})

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
