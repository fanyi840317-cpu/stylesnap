/**
 * Shared CSS-to-Tailwind mapping utilities (TypeScript version)
 * Used by tailwind-mapper.ts (main thread)
 */

// ─── Tailwind mapping tables ───────────────────────────────
export const DISPLAY_MAP: Record<string, string> = {
  block: 'block', inline: 'inline', 'inline-block': 'inline-block',
  flex: 'flex', grid: 'grid', none: 'hidden',
}
export const POSITION_MAP: Record<string, string> = {
  relative: 'relative', absolute: 'absolute', fixed: 'fixed', sticky: 'sticky',
}
export const OVERFLOW_MAP: Record<string, string> = { hidden: 'overflow-hidden', auto: 'overflow-auto', visible: 'overflow-visible' }
export const FLEX_DIR_MAP: Record<string, string> = {
  row: 'flex-row', column: 'flex-col',
  'row-reverse': 'flex-row-reverse', 'column-reverse': 'flex-col-reverse',
}
export const FLEX_WRAP_MAP: Record<string, string> = { wrap: 'flex-wrap', nowrap: 'flex-nowrap' }
export const JUSTIFY_MAP: Record<string, string> = {
  center: 'justify-center', 'space-between': 'justify-between',
  'space-around': 'justify-around', 'flex-start': 'justify-start', 'flex-end': 'justify-end',
}
export const ALIGN_MAP: Record<string, string> = {
  center: 'items-center', start: 'items-start', end: 'items-end', stretch: 'items-stretch',
}
export const ALIGN_CONTENT_MAP: Record<string, string> = {
  center: 'content-center', start: 'content-start', end: 'content-end',
}
export const GAP_MAP: Record<string, string> = { '4px': 'gap-1', '8px': 'gap-2', '12px': 'gap-3', '16px': 'gap-4', '20px': 'gap-5', '24px': 'gap-6', '32px': 'gap-8' }
export const PADDING_MAP: Record<string, string> = { '4px': 'p-1', '8px': 'p-2', '12px': 'p-3', '16px': 'p-4', '20px': 'p-5', '24px': 'p-6', '32px': 'p-8' }
export const MARGIN_MAP: Record<string, string> = { '4px': 'm-1', '8px': 'm-2', '12px': 'm-3', '16px': 'm-4', '20px': 'm-5', '24px': 'm-6', '32px': 'm-8' }
export const ROUND_MAP: Record<string, string> = { '4px': 'rounded', '6px': 'rounded-md', '8px': 'rounded-lg', '12px': 'rounded-xl', '9999px': 'rounded-full', '50%': 'rounded-full' }
export const FONT_SIZE_MAP: Record<string, string> = {
  '12px': 'text-xs', '14px': 'text-sm', '16px': 'text-base',
  '18px': 'text-lg', '20px': 'text-xl', '24px': 'text-2xl',
  '30px': 'text-3xl', '36px': 'text-4xl',
}
export const FONT_WEIGHT_MAP: Record<string, string> = {
  '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold',
  '700': 'font-bold', '800': 'font-extrabold',
}
export const TEXT_ALIGN_MAP: Record<string, string> = {
  center: 'text-center', left: 'text-left', right: 'text-right', justify: 'text-justify',
}
export const BORDER_STYLE_MAP: Record<string, string> = { solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted' }
export const BOX_SHADOW_MAP: Record<string, string> = {
  '0 1px 3px 0 rgba(0,0,0,0.1)': 'shadow-sm',
  '0 4px 6px -1px rgba(0,0,0,0.1)': 'shadow',
  '0 10px 15px -3px rgba(0,0,0,0.1)': 'shadow-lg',
}
export const CURSOR_MAP: Record<string, string> = { pointer: 'cursor-pointer', default: 'cursor-default' }
export const USER_SELECT_MAP: Record<string, string> = { none: 'select-none', text: 'select-text' }
export const TRANSITION_MAP: Record<string, string> = {
  all: 'transition', 'background-color': 'transition-colors',
  'opacity': 'transition-opacity', 'transform': 'transition-transform',
}

// ─── Parsing helpers ──────────────────────────────────────
export function parsePx(v: string): number | null {
  if (!v || v === '0' || v === '0px') return 0
  if (v.startsWith('var(') || v.startsWith('calc(')) return null
  const m = v.match(/^([\d.]+)(px|rem)?$/)
  if (!m) return null
  const n = parseFloat(m[1])
  return m[2] === 'rem' ? n * 16 : n
}

export function parseColor(v: string): string | null {
  if (!v || v === 'none' || v === 'transparent') return null
  if (v.startsWith('var(') || v.startsWith('calc(')) return null
  if (v.startsWith('rgba(')) {
    const m = v.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
    if (m) {
      const [, r, g, b, a] = m
      const alpha = Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0')
      return `#${Number(r).toString(16).padStart(2,'0')}${Number(g).toString(16).padStart(2,'0')}${Number(b).toString(16).padStart(2,'0')}${alpha}`
    }
  }
  if (v.startsWith('rgb(')) {
    const m = v.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (m) {
      const [, r, g, b] = m
      return `#${Number(r).toString(16).padStart(2,'0')}${Number(g).toString(16).padStart(2,'0')}${Number(b).toString(16).padStart(2,'0')}`
    }
  }
  if (v.startsWith('#')) return v.length === 7 || v.length === 9 ? v : null
  return null
}

export function tailwindizeValue(prop: string, val: string): string | null {
  if (!val) return null
  const v = val.toString().trim()
  switch (prop) {
    case 'display':           return DISPLAY_MAP[v] || null
    case 'position':          return POSITION_MAP[v] || null
    case 'overflow':          return OVERFLOW_MAP[v] || null
    case 'overflow-x':        return v === 'hidden' ? 'overflow-x-hidden' : v === 'auto' ? 'overflow-x-auto' : null
    case 'overflow-y':        return v === 'hidden' ? 'overflow-y-hidden' : v === 'auto' ? 'overflow-y-auto' : null
    case 'flex-direction':    return FLEX_DIR_MAP[v] || null
    case 'flex-wrap':         return FLEX_WRAP_MAP[v] || null
    case 'justify-content':   return JUSTIFY_MAP[v] || null
    case 'align-items':      return ALIGN_MAP[v] || null
    case 'align-content':    return ALIGN_CONTENT_MAP[v] || null
    case 'cursor':            return CURSOR_MAP[v] || null
    case 'user-select':       return USER_SELECT_MAP[v] || null
    case 'text-align':        return TEXT_ALIGN_MAP[v] || null
    case 'font-weight':       return FONT_WEIGHT_MAP[v] || null
    case 'border-style':      return BORDER_STYLE_MAP[v] || null
    case 'box-shadow':        return BOX_SHADOW_MAP[v] || null
    case 'transition':        return TRANSITION_MAP[v] || null
    case 'gap':
    case 'padding':
    case 'padding-top':
    case 'padding-bottom':
    case 'padding-left':
    case 'padding-right':
    case 'margin':
    case 'margin-top':
    case 'margin-bottom':
    case 'margin-left':
    case 'margin-right': {
      const n = parsePx(v)
      if (n === null) return null
      const map = prop.startsWith('gap') ? GAP_MAP : prop.startsWith('padding') ? PADDING_MAP : MARGIN_MAP
      for (const [px, cls] of Object.entries(map)) {
        if (parsePx(px) === n) return cls
      }
      return null
    }
    case 'border-radius': {
      const n = parsePx(v)
      if (n === null) return null
      for (const [px, cls] of Object.entries(ROUND_MAP)) {
        if (parsePx(px) === n) return cls
      }
      return null
    }
    case 'font-size': {
      const n = parsePx(v)
      if (n === null) return null
      for (const [px, cls] of Object.entries(FONT_SIZE_MAP)) {
        if (parsePx(px) === n) return cls
      }
      return null
    }
    default: return null
  }
}

// ─── Main function ─────────────────────────────────────────
export function cssToTailwind(css: Record<string, string>): { classes: string[]; unmatched: Record<string, string> } {
  const classes: string[] = []
  const unmatched: Record<string, string> = {}

  for (const [prop, val] of Object.entries(css)) {
    if (!val || prop.startsWith('--') || prop.startsWith('-webkit-')) continue

    // Skip modern CSS color spaces
    if (typeof val === 'string' &&
        (val.includes('hsl(') || val.includes('oklch(') ||
         val.includes('color(') || val.includes('lab('))) {
      continue
    }

    const tw = tailwindizeValue(prop, val)
    if (tw) {
      classes.push(tw)
    } else {
      // Size-based mapping
      const n = parsePx(val)
      if (n !== null) {
        if (prop === 'width' || prop === 'height') {
          const prefix = prop === 'width' ? 'w' : 'h'
          if (n === 0) classes.push(`${prefix}-0`)
          else if (n === 4) classes.push(`${prefix}-1`)
          else if (n === 8) classes.push(`${prefix}-2`)
          else if (n === 12) classes.push(`${prefix}-3`)
          else if (n === 16) classes.push(`${prefix}-4`)
          else if (n === 20) classes.push(`${prefix}-5`)
          else if (n === 24) classes.push(`${prefix}-6`)
          else if (n === 32) classes.push(`${prefix}-8`)
          else if (n === 40) classes.push(`${prefix}-10`)
          else if (n === 48) classes.push(`${prefix}-12`)
          else unmatched[prop] = val
        } else {
          unmatched[prop] = val
        }
      } else {
        unmatched[prop] = val
      }
    }
  }

  return { classes, unmatched }
}
