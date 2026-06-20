/**
 * Content Script — Shared State
 * All global state is managed here to avoid circular dependencies.
 */

// ─── State ─────────────────────────────────────────
export let inspectMode = 0
export let lastMode = 0           // last used mode, for UI hint only
export let autoOpenSidePanel = true
export let lastHighlighted: Element | null = null
export let lockedElement: Element | null = null
export let sidePanelOpen = false

// ─── Constants ─────────────────────────────────────
export const OVERLAY_ID = 'stylesnap-overlay'
export const HIGHLIGHT_CLASS = 'stylesnap-highlight'
export const LOCKED_CLASS = 'stylesnap-locked'
export const FLOATING_BTN_ID = 'stylesnap-floating-btn'

// ─── State setters (called from other modules) ─────
export function setInspectModeValue(v: number): void {
  inspectMode = v
}

export function setLastModeValue(v: number): void {
  lastMode = v
}

export function setAutoOpenSidePanelValue(v: boolean): void {
  autoOpenSidePanel = v
}

export function setLastHighlighted(el: Element | null): void {
  lastHighlighted = el
}

export function setLockedElement(el: Element | null): void {
  lockedElement = el
}

export function setSidePanelOpen(v: boolean): void {
  sidePanelOpen = v
}

// ─── Derived helpers ───────────────────────────────
export const isActive = (): boolean => inspectMode > 0
export const assistMode = (): number => (inspectMode >= 2 ? inspectMode - 1 : 0)
