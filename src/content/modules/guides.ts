/**
 * Guides Module
 * Horizontal/vertical guide lines when inspecting elements
 */
import { assistMode } from './state'

const GUIDE_IDS = ['stylesnap-guide-t', 'stylesnap-guide-b', 'stylesnap-guide-l', 'stylesnap-guide-r']

export function initGuides(): void {
  GUIDE_IDS.forEach(id => {
    if (!document.getElementById(id)) {
      const el = document.createElement('div')
      el.id = id
      el.className = 'stylesnap-guide'
      el.setAttribute('data-stylesnap', 'true')
      document.body.appendChild(el)
    }
  })
}

export function updateGuides(rect: DOMRect): void {
  if (assistMode() !== 1) return
  const t = document.getElementById('stylesnap-guide-t')
  const b = document.getElementById('stylesnap-guide-b')
  const l = document.getElementById('stylesnap-guide-l')
  const r = document.getElementById('stylesnap-guide-r')
  if (t && b && l && r) {
    t.style.top    = `${rect.top}px`
    b.style.top    = `${rect.bottom}px`
    l.style.left   = `${rect.left}px`
    r.style.left   = `${rect.right}px`
  }
}

export function removeGuides(): void {
  GUIDE_IDS.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.remove()
  })
}
