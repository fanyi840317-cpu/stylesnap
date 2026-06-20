/**
 * Content Script
 * Injected into every page. Handles hover detection, CSS extraction,
 * element highlighting, and design token scanning.
 */
import { parseElement, extractComponentCSS, extractComponentHTML } from '@/lib/css-extractor'
import { extractDesignTokens } from '@/lib/token-extractor'
import { collectAnnotatableElements } from '@/lib/annotator'
import type { ParsedCSS } from '@/shared/types'
import { createFloatingButton } from '@/content/modules/floating-button'
import { inspectMode, setInspectModeValue, setLastHighlighted, setLockedElement, lastHighlighted, lockedElement } from '@/content/modules/state'

// ─── State ────────────────────────────────────────────────────────────
// isActive/lastHighlighted/lockedElement are now imported from @/content/modules/state
// assistMode is derived from inspectMode locally for UI (sync with state.ts assistMode())

let assistMode = 1 // 0: Off, 1: Guidelines (Crosshairs), 2: Grid (Outlines)
const OVERLAY_ID = 'stylesnap-overlay'
const HIGHLIGHT_CLASS = 'stylesnap-highlight'
const LOCKED_CLASS = 'stylesnap-locked'

function updateAssistModeUI() {
  document.body.classList.remove('stylesnap-mode-guidelines', 'stylesnap-mode-grid')
  if (assistMode === 1) {
    document.body.classList.add('stylesnap-mode-guidelines')
  } else if (assistMode === 2) {
    document.body.classList.add('stylesnap-mode-grid')
  }
}

function initGuides() {
  const ids = ['stylesnap-guide-t', 'stylesnap-guide-b', 'stylesnap-guide-l', 'stylesnap-guide-r']
  ids.forEach(id => {
    if (!document.getElementById(id)) {
      const el = document.createElement('div')
      el.id = id
      el.className = 'stylesnap-guide'
      el.setAttribute('data-stylesnap', 'true')
      document.body.appendChild(el)
    }
  })
}

function updateGuides(rect: DOMRect) {
  if (assistMode !== 1) return
  const t = document.getElementById('stylesnap-guide-t')
  const b = document.getElementById('stylesnap-guide-b')
  const l = document.getElementById('stylesnap-guide-l')
  const r = document.getElementById('stylesnap-guide-r')
  if (t && b && l && r) {
    t.style.top = `${rect.top}px`
    b.style.top = `${rect.bottom}px`
    l.style.left = `${rect.left}px`
    r.style.left = `${rect.right}px`
  }
}

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

  const { styles, tailwindClasses = [], tailwindMatchRate = 0, responsiveStyles, pseudoStyles } = parsedCSS
  const tailwindStr = tailwindClasses.slice(0, 8).join(' ') + (tailwindClasses.length > 8 ? ' …' : '')
  const matchPct = Math.round(tailwindMatchRate * 100)

  const cssPreview = Object.entries(styles)
    .slice(0, 8)
    .map(([k, v]) => `<span class="ss-prop">${k}:</span> <span class="ss-val">${v}</span>`)
    .join('\n')

  // Responsive (@media) styles
  let responsiveHTML = ''
  if (responsiveStyles && Object.keys(responsiveStyles).length > 0) {
    const items = Object.entries(responsiveStyles).flatMap(([media, props]) =>
      `<div><strong>${media}:</strong></div>` +
      Object.entries(props).slice(0, 4).map(([k, v]) =>
        `<span class="ss-prop">${k}:</span> <span class="ss-val">${v}</span>`
      ).join('\n')
    ).join('\n')
    responsiveHTML = `\n    <div class="ss-responsive"><strong>@media</strong>\n${items}\n    </div>`
  }

  // Pseudo-class styles (:hover etc.)
  let pseudoHTML = ''
  if (pseudoStyles && Object.keys(pseudoStyles).length > 0) {
    const items = Object.entries(pseudoStyles).flatMap(([pseudo, props]) =>
      `<div><strong>${pseudo}:</strong></div>` +
      Object.entries(props).slice(0, 4).map(([k, v]) =>
        `<span class="ss-prop">${k}:</span> <span class="ss-val">${v}</span>`
      ).join('\n')
    ).join('\n')
    pseudoHTML = `\n    <div class="ss-pseudo"><strong>:pseudo</strong>\n${items}\n    </div>`
  }

  overlay.innerHTML = `
    <div class="ss-header">
      <span class="ss-tag">${el.tagName.toLowerCase()}</span>
      <span class="ss-dim">${Math.round(rect.width)}×${Math.round(rect.height)}</span>
      <span class="ss-match">TW ${matchPct}%</span>
    </div>
    ${tailwindStr ? `<div class="ss-tw">${tailwindStr}</div>` : ''}
    <pre class="ss-css">${cssPreview}</pre>${responsiveHTML}${pseudoHTML}
  `

  // Position overlay
  // 先将 display 设为 block 以便获取悬浮框的真实尺寸
  overlay.style.setProperty('display', 'block', 'important')
  const overlayRect = overlay.getBoundingClientRect()
  const overlayWidth = overlayRect.width || 320
  const overlayHeight = overlayRect.height || 150

  // 默认放在元素下方 (使用 fixed 定位，无需 scrollX/Y)
  let top = rect.bottom + 4
  let left = rect.left
  overlay.style.setProperty('transform', 'none', 'important') // 重置 transform

  // 如果下方空间不够，放在元素上方
  if (rect.bottom + overlayHeight + 10 > window.innerHeight) {
    top = rect.top - overlayHeight - 4
    
    // 如果上方空间也不够，就固定在视口底部
    if (top < 0) {
      top = window.innerHeight - overlayHeight - 10
    }
  }

  // 处理水平方向边界
  const maxLeft = window.innerWidth - overlayWidth - 10
  left = Math.max(10, Math.min(left, maxLeft))

  overlay.style.setProperty('top', `${top}px`, 'important')
  overlay.style.setProperty('left', `${left}px`, 'important')
}

function hideOverlay() {
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) overlay.style.setProperty('display', 'none', 'important')
}

function highlightElement(el: Element) {
  if (lockedElement && el !== lockedElement) return
  removeHighlight()
  el.classList.add(HIGHLIGHT_CLASS)
  setLastHighlighted(el)
}

function removeHighlight() {
  if (lastHighlighted && lastHighlighted !== lockedElement) {
    lastHighlighted.classList.remove(HIGHLIGHT_CLASS)
    setLastHighlighted(null)
  }
}

function lockElement(el: Element) {
  if (lockedElement) {
    lockedElement.classList.remove(LOCKED_CLASS)
  }
  setLockedElement(el)
  el.classList.add(LOCKED_CLASS)
  el.classList.remove(HIGHLIGHT_CLASS)
  setLastHighlighted(null)

  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) {
    overlay.classList.add('ss-interactive')
  }
}

function unlockElement() {
  if (lockedElement) {
    lockedElement.classList.remove(LOCKED_CLASS)
    setLockedElement(null)
  }
  
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) {
    overlay.classList.remove('ss-interactive')
  }
}

// ─── Event handlers ───────────────────────────────────────────────────

function onMouseMove(e: MouseEvent) {
  if (inspectMode === 0 || lockedElement) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el || el.closest('[data-stylesnap]')) return
  if (el === lastHighlighted) return

  highlightElement(el)
  const parsedCSS = parseElement(el)
  showOverlay(el, parsedCSS)
  updateGuides(el.getBoundingClientRect())

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
  if (inspectMode === 0) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  
  // 如果点击的是 overlay 内部，不要触发解锁或新元素的锁定
  if (el && el.closest('#' + OVERLAY_ID)) {
    return
  }

  // 如果点击了扩展的 UI（例如右下角的悬浮按钮），直接忽略
  if (el && el.closest('[data-stylesnap]')) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  // 如果点到了非元素区域 (比如 document 空白)，或者点到了 `<html>`/`<body>`，视为空白处解锁
  if (!el || el === document.documentElement || el === document.body) {
    if (lockedElement) {
      unlockElement()
      chrome.runtime.sendMessage({ type: 'ELEMENT_UNLOCKED' }).catch(() => {})
      hideOverlay()
    }
    return
  }

  // 此时 el 是网页中有效的一个元素
  if (lockedElement) {
    // 无论点击的是已锁定的元素本身，还是其他有效元素，
    // 都认为用户的意图是“取消当前的锁定状态”
    unlockElement()
    chrome.runtime.sendMessage({ type: 'ELEMENT_UNLOCKED' }).catch(() => {})
    // 手动触发一次 hover 以更新高亮和信息框
    onMouseMove(e)
    return
  }

  // 当前没有锁定任何元素，正常执行锁定
  lockElement(el)

  const parsedCSS = parseElement(el)
  const componentHTML = extractComponentHTML(el, 3)
  const componentCSS = extractComponentCSS(el, 3)

  showOverlay(el, parsedCSS)
  updateGuides(el.getBoundingClientRect())

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
  // Ignore if typing in an input
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
    return
  }

  if (inspectMode > 0 && (e.key === 'g' || e.key === 'G')) {
    e.preventDefault()
    e.stopPropagation()
    assistMode = (assistMode + 1) % 3
    updateAssistModeUI()
    
    // Save to settings
    chrome.storage.local.get(['stylesnap_settings'], (res) => {
      const s = res.stylesnap_settings || {}
      s.assistMode = assistMode
      chrome.storage.local.set({ stylesnap_settings: s })
    })
    
    // Show a quick toast
    const modeNames = ['Assist: OFF', 'Assist: Guidelines', 'Assist: Grid']
    showToast(modeNames[assistMode])

    const target = lockedElement || lastHighlighted
    if (target) {
      updateGuides(target.getBoundingClientRect())
    }
    return
  }

  if (e.key === 'Escape' && inspectMode > 0) {
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

// ─── Toast Notification ────────────────────────────────────────────────

let toastTimeout: number | null = null
function showToast(message: string) {
  let toast = document.getElementById('stylesnap-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'stylesnap-toast'
    toast.setAttribute('data-stylesnap', 'true')
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(15, 23, 42, 0.9)',
      color: '#fff',
      padding: '8px 16px',
      borderRadius: '8px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontWeight: '500',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transition: 'opacity 0.2s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.1)'
    })
    document.body.appendChild(toast)
  }
  
  toast.textContent = message
  toast.style.opacity = '1'
  
  if (toastTimeout) window.clearTimeout(toastTimeout)
  toastTimeout = window.setTimeout(() => {
    if (toast) toast.style.opacity = '0'
  }, 2000)
}

function onScroll() {
  if (inspectMode === 0) return
  const target = lockedElement || lastHighlighted
  if (target) {
    updateGuides(target.getBoundingClientRect())
  }
}

// ─── Inspector control ────────────────────────────────────────────────

function enableInspector() {
  if (inspectMode > 0) return
  setInspectModeValue(1)
  initGuides()
  
  // Load assistMode from settings
  chrome.storage.local.get(['stylesnap_settings'], (res) => {
    if (res.stylesnap_settings && res.stylesnap_settings.assistMode !== undefined) {
      assistMode = res.stylesnap_settings.assistMode
    } else {
      assistMode = 1 // default
    }
    updateAssistModeUI()
  })
}

function disableInspector() {
  setInspectModeValue(0)
  assistMode = 0
  updateAssistModeUI()
  unlockElement()
  removeHighlight()
  hideOverlay()
}

// ─── Event listeners (registered once at script load) ─────────────────
// Handlers gate themselves with `inspectMode === 0` check at the top.
document.addEventListener('mousemove', onMouseMove, true)
document.addEventListener('click', onClick, true)
document.addEventListener('keydown', onKeyDown, true)
document.addEventListener('scroll', onScroll, true)

// ─── Floating Button UI ────────────────────────────────────────────────

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => createFloatingButton())
} else {
  createFloatingButton()
}

// ─── Message handling ─────────────────────────────────────────────────

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.language) {
      const lang = changes.language.newValue
      // Update floating button text
      if (inspectMode > 0) {
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
    
    if (changes.stylesnap_settings) {
      const newSettings = changes.stylesnap_settings.newValue
      if (newSettings && newSettings.assistMode !== undefined) {
        assistMode = newSettings.assistMode
        updateAssistModeUI()
      }
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


// ── Automation bridge (for MCP testing) ─────────────────────
// Allow MCP tools to control inspector via CustomEvent on document.body
document.addEventListener('__styleSnap_toggleInspector', () => {
  if (inspectMode > 0) disableInspector()
  else enableInspector()
})
