/**
 * Floating Button Module
 * The small ball button that toggles inspect modes
 */
import { FLOATING_BTN_ID, autoOpenSidePanel } from './state'
import { inspectMode, lastMode, setInspectModeValue, setLastModeValue, setLastHighlighted, setLockedElement } from './state'
import { removeHighlight, unlockElement, getLockedElement, getLastHighlighted } from './highlight'
import { hideOverlay } from './overlay'
import { updateGuides } from './guides'

// ─── Mode icon mapping ──────────────────────────
const MODE_ICON_SVG = [
  // 0: Off
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  // 1: Inspect
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  // 2: Guidelines
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`,
  // 3: Grid
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
] as const

const MODE_BADGE_COLOR = ['#5F5E5A', '#534AB7', '#0F6E56', '#185FA5'] as const

// ─── Create floating button ──────────────────────
export function createFloatingButton(): void {
  if (document.getElementById(FLOATING_BTN_ID)) return

  const btn = document.createElement('div')
  btn.id = FLOATING_BTN_ID
  btn.setAttribute('data-stylesnap', 'true')
  btn.innerHTML = `
    <div class="stylesnap-main-ball">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    </div>
    <div class="stylesnap-mode-badge"></div>
    <div class="stylesnap-mode-group">
      <button class="stylesnap-mode-btn" data-mode="1" title="Inspect">${MODE_ICON_SVG[1]}</button>
      <button class="stylesnap-mode-btn" data-mode="2" title="Guidelines">${MODE_ICON_SVG[2]}</button>
      <button class="stylesnap-mode-btn" data-mode="3" title="Grid">${MODE_ICON_SVG[3]}</button>
    </div>
  `
  btn.querySelector('.stylesnap-main-ball')?.addEventListener('click', onMainBallClick as any)
  btn.querySelectorAll('.stylesnap-mode-btn').forEach(btnEl => {
    btnEl.addEventListener('click', onModeButtonClick as any)
  })
  ;(document.documentElement || document.body).appendChild(btn)
  updateFloatingButtonUI()
}

// ─── Event handlers ─────────────────────────────
function onMainBallClick(e: MouseEvent): void {
  e.preventDefault()
  e.stopPropagation()
  if (inspectMode > 0) {
    setInspectModeValue(0)
    cleanupInspector()
  } else {
    setLastModeValue(lastMode > 0 ? lastMode : 1)
    setInspectModeValue(lastMode)
    if (autoOpenSidePanel) chrome.runtime.sendMessage({ action: 'openSidePanel' })
  }
  updateFloatingButtonUI()
}

function onModeButtonClick(e: MouseEvent): void {
  e.preventDefault()
  e.stopPropagation()
  const mode = parseInt((e.currentTarget as HTMLElement).dataset.mode || '0', 10)
  if (mode === inspectMode) {
    setInspectModeValue(0)
    cleanupInspector()
  } else {
    setLastModeValue(mode)
    setInspectModeValue(mode)
    if (autoOpenSidePanel) chrome.runtime.sendMessage({ action: 'openSidePanel' })
  }
  updateFloatingButtonUI()
}

function cleanupInspector(): void {
  removeHighlight()
  unlockElement()
  hideOverlay()
  setLastHighlighted(null)
  setLockedElement(null)
}

// ─── Update UI ──────────────────────────────────
export function updateFloatingButtonUI(): void {
  const btn = document.getElementById(FLOATING_BTN_ID)
  if (!btn) return

  // active ring animation
  if (inspectMode > 0) btn.classList.add('is-active')
  else btn.classList.remove('is-active')

  // corner badge on main ball
  const badge = btn.querySelector('.stylesnap-mode-badge') as HTMLElement | null
  if (badge) {
    badge.innerHTML = inspectMode > 0 ? MODE_ICON_SVG[inspectMode] : ''
    badge.style.background = inspectMode > 0 ? MODE_BADGE_COLOR[inspectMode] : 'transparent'
    badge.style.border = inspectMode === 0 ? '1.5px solid rgba(255,255,255,0.25)' : 'none'
  }

  // mode button group: highlight the active one, hint the last used one
  const modeBtns = btn.querySelectorAll('.stylesnap-mode-btn')
  modeBtns.forEach((b) => {
    const mode = parseInt((b as HTMLElement).dataset.mode || '0', 10)
    b.classList.toggle('is-active', mode === inspectMode)
    b.classList.toggle('is-preferred', mode === lastMode && inspectMode === 0)
  })

  // guides
  const target = getLockedElement() || getLastHighlighted()
  if (target) updateGuides(target.getBoundingClientRect())
}

// ─── Re-exports for convenience ─────────────────
export { inspectMode, lastMode } from './state'
