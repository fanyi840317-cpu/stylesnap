/**
 * Highlight Module
 * Element highlight, lock/unlock logic
 */
import {
  HIGHLIGHT_CLASS,
  LOCKED_CLASS,
  lastHighlighted,
  lockedElement,
  setLastHighlighted,
  setLockedElement,
} from './state'

// ── Highlight logic ──────────────────────────────
export function highlightElement(el: Element): void {
  if (lockedElement && el !== lockedElement) return
  removeHighlight()
  el.classList.add(HIGHLIGHT_CLASS)
  setLastHighlighted(el)
}

export function removeHighlight(): void {
  if (lastHighlighted && lastHighlighted !== lockedElement) {
    lastHighlighted.classList.remove(HIGHLIGHT_CLASS)
    setLastHighlighted(null)
  }
}

export function lockElement(el: Element): void {
  if (lockedElement) lockedElement.classList.remove(LOCKED_CLASS)
  setLockedElement(el)
  el.classList.add(LOCKED_CLASS)
  el.classList.remove(HIGHLIGHT_CLASS)
  setLastHighlighted(null)
  const overlay = document.getElementById('stylesnap-overlay')
  if (overlay) overlay.classList.add('ss-active')
}

export function unlockElement(): void {
  if (lockedElement) {
    lockedElement.classList.remove(LOCKED_CLASS)
    setLockedElement(null)
  }
  const overlay = document.getElementById('stylesnap-overlay')
  if (overlay) overlay.classList.remove('ss-active')
}

export function getLockedElement(): Element | null {
  return lockedElement
}

export function getLastHighlighted(): Element | null {
  return lastHighlighted
}

// ── Show overlay with parsed CSS ─────────────────
// These functions are now in overlay.ts
// This module just handles highlight/lock logic
