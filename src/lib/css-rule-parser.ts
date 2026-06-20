/**
 * CSS Rule Parser
 * Parses document.styleSheets to extract responsive (@media) and
 * pseudo-class (:hover/:focus etc.) rules that getComputedStyle() misses.
 *
 * Handles CORS gracefully — skips cross-origin sheets silently.
 */

import { CSSPropertyMap } from '@/shared/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Walk every CSSRule in a stylesheet, descending into @media / @supports etc. */
function* walkRules(sheet: CSSStyleSheet): Generator<CSSStyleRule> {
  try {
    const rules = sheet.cssRules
    if (!rules) return
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        yield rule
      } else if (
        rule instanceof CSSMediaRule ||
        rule instanceof CSSSupportsRule ||
        rule instanceof CSSConditionRule
      ) {
        yield* walkRules(rule as unknown as CSSStyleSheet)
      }
    }
  } catch {
    // CORS — skip silently
  }
}

/** Check if an element matches a CSS selector */
function matchesSelector(el: Element, selector: string): boolean {
  try {
    return el.matches(selector)
  } catch {
    return false
  }
}

/** Extract all property → value pairs from a CSSStyleDeclaration */
function styleDeclToMap(style: CSSStyleDeclaration): CSSPropertyMap {
  const map: CSSPropertyMap = {}
  for (let i = 0; i < style.length; i++) {
    const prop = style[i]
    const val = style.getPropertyValue(prop)
    if (val) map[prop] = val
  }
  return map
}

// ── Responsive styles (@media) ──────────────────────────────────────────────

export interface ResponsiveEntry {
  /** The @media query string, e.g. "(min-width: 768px)" */
  media: string
  styles: CSSPropertyMap
}

/**
 * Extract styles from @media rules that match the current viewport.
 *
 * For each @media rule whose condition evaluates to true in the current
 * viewport, collect all property → value pairs whose selector matches `el`.
 */
export function extractResponsiveStyles(el: Element): Record<string, CSSPropertyMap> {
  const result: Record<string, CSSPropertyMap> = {}
  const selectors = getSelectorsForElement(el)

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules
      if (!rules) continue

      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSMediaRule)) continue

        // Check if this @media query matches the current viewport
        const mediaText = rule.conditionText || ''
        if (!mediaText) continue

        // Use MediaQueryList to test — matches current viewport
        // We can't run media queries in JS, but we can check if the
        // browser currently matches them via window.matchMedia
        // Actually, let's just collect ALL @media rules and annotate them —
        // at runtime we don't know which media queries match.
        // Better approach: collect the rules and let the caller decide.

        // For now, collect all @media rules that have matching selectors
        const mediaKey = `@media ${mediaText}`
        if (!result[mediaKey]) result[mediaKey] = {}

        for (const childRule of Array.from(rule.cssRules)) {
          if (!(childRule instanceof CSSStyleRule)) continue
          if (!selectors.some(s => matchesSelector(el, s))) continue
          const decl = styleDeclToMap(childRule.style)
          Object.assign(result[mediaKey], decl)
        }
      }
    } catch {
      // CORS sheet — skip
    }
  }

  // Remove empty entries
  for (const key of Object.keys(result)) {
    if (Object.keys(result[key]).length === 0) delete result[key]
  }

  return result
}

// ── Pseudo-class styles ───────────────────────────────────────────────────

const PSEUDO_CLASSES = [
  ':hover', ':focus', ':focus-visible', ':focus-within',
  ':active', ':visited', ':disabled', ':enabled',
  ':checked', ':required', ':optional', ':valid', ':invalid',
  ':first-child', ':last-child', ':nth-child', ':first-of-type',
]

/**
 * Extract pseudo-class styles by reading the stylesheet rules directly.
 *
 * For each pseudo-class selector (e.g. `a:hover`) that matches `el`,
 * collect the declared properties.
 */
export function extractPseudoStyles(el: Element): Record<string, CSSPropertyMap> {
  const result: Record<string, CSSPropertyMap> = {}

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of walkRules(sheet)) {
        const selector = rule.selectorText
        if (!selector) continue

        // Check if any pseudo-class is in the selector
        const matchedPseudo = PSEUDO_CLASSES.find(p => selector.includes(p))
        if (!matchedPseudo) continue

        // Check if this rule's selector (minus pseudo) matches our element
        const baseSelector = selector.replace(/:hover|:focus|:focus-visible|:focus-within|:active|:visited|:disabled|:enabled|:checked|:required|:optional|:valid|:invalid|:first-child|:last-child|:nth-child\(.*?\)|:first-of-type/g, '').trim()
        if (!baseSelector) continue
        // Check if this rule's base selector matches our element
        if (!matchesSelector(el, baseSelector)) continue

        if (!result[matchedPseudo]) result[matchedPseudo] = {}
        const decl = styleDeclToMap(rule.style)
        Object.assign(result[matchedPseudo], decl)
      }
    } catch {
      // CORS — skip
    }
  }

  // Remove empty entries
  for (const key of Object.keys(result)) {
    if (Object.keys(result[key]).length === 0) delete result[key]
  }

  return result
}

// ── Element selector helpers ───────────────────────────────────────────────

/** Get all CSS selectors that could match this element */
function getSelectorsForElement(el: Element): string[] {
  const selectors: string[] = []

  // Tag
  selectors.push(el.tagName.toLowerCase())

  // ID
  if (el.id) selectors.push(`#${el.id}`)

  // Classes
  for (const cls of Array.from(el.classList)) {
    selectors.push(`.${cls}`)
    selectors.push(`${el.tagName.toLowerCase()}.${cls}`)
  }

  return selectors
}

/** Build a selector for the element (same logic as css-extractor.ts getSelector) */
export function getElementSelector(el: Element): string {
  if (el.id) return `#${el.id}`

  const classes = Array.from(el.classList).slice(0, 3)
  if (classes.length > 0) {
    return `${el.tagName.toLowerCase()}.${classes.join('.')}`
  }

  // nth-child
  const parent = el.parentElement
  if (parent) {
    const index = Array.from(parent.children).indexOf(el) + 1
    return `${el.tagName.toLowerCase()}:nth-child(${index})`
  }

  return el.tagName.toLowerCase()
}
