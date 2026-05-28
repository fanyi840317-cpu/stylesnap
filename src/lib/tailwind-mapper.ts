/**
 * Tailwind CSS Mapper
 * Deterministically converts CSS property/value pairs to Tailwind utility classes
 * Coverage: ~90% of common patterns. AI fallback handles the rest.
 */
import { CSSPropertyMap } from '@/shared/types'

interface TailwindResult {
  classes: string[]
  unmatched: CSSPropertyMap
  matchRate: number
}

type MappingFn = (value: string) => string | null

// ─── Utility helpers ─────────────────────────────────────────────────


function parsePx(val: string): number | null {
  const m = val.match(/^(-?[\d.]+)px$/)
  return m ? parseFloat(m[1]) : null
}

// Map pixel values to Tailwind spacing scale
function spacingClass(prefix: string, val: string): string | null {
  const px = parsePx(val)
  if (px === null) return null
  if (px === 0) return `${prefix}-0`

  // Common spacing values
  const SCALE: Record<number, string> = {
    1: 'px',
    2: '0.5',
    4: '1',
    6: '1.5',
    8: '2',
    10: '2.5',
    12: '3',
    14: '3.5',
    16: '4',
    20: '5',
    24: '6',
    28: '7',
    32: '8',
    36: '9',
    40: '10',
    44: '11',
    48: '12',
    56: '14',
    64: '16',
    80: '20',
    96: '24',
    112: '28',
    128: '32',
    144: '36',
    160: '40',
    176: '44',
    192: '48',
    208: '52',
    224: '56',
    240: '60',
    256: '64',
    288: '72',
    320: '80',
    384: '96',
  }

  if (SCALE[px]) return `${prefix}-${SCALE[px]}`

  // Fractional: auto
  if (val === 'auto') return `${prefix}-auto`

  // Percentage
  const pct = val.match(/^([\d.]+)%$/)
  if (pct) {
    const n = parseFloat(pct[1])
    const fractions: Record<number, string> = {
      50: '1/2', 33.333333: '1/3', 66.666667: '2/3',
      25: '1/4', 75: '3/4',
      20: '1/5', 40: '2/5', 60: '3/5', 80: '4/5',
      100: 'full',
    }
    for (const [k, v] of Object.entries(fractions)) {
      if (Math.abs(n - parseFloat(String(k))) < 0.1) return `${prefix}-${v}`
    }
  }

  return `${prefix}-[${val}]`
}

// Convert color to Tailwind color class (best effort)
function colorClass(prefix: string, val: string): string | null {
  if (!val || val === 'transparent' || val === 'rgba(0, 0, 0, 0)') {
    return `${prefix}-transparent`
  }
  if (val === 'currentColor' || val === 'currentcolor') return `${prefix}-current`
  if (val === 'inherit') return `${prefix}-inherit`

  // Convert rgb to hex
  const rgb = val.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (rgb) {
    const hex = '#' + [rgb[1], rgb[2], rgb[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
    return `${prefix}-[${hex}]`
  }

  const rgba = val.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/)
  if (rgba) {
    const hex = '#' + [rgba[1], rgba[2], rgba[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
    const alpha = Math.round(parseFloat(rgba[4]) * 100)
    return `${prefix}-[${hex}]/${alpha}`
  }

  if (val.startsWith('#')) return `${prefix}-[${val}]`

  return null
}

// ─── Property mappers ─────────────────────────────────────────────────

const DISPLAY_MAP: Record<string, string> = {
  'block': 'block',
  'inline-block': 'inline-block',
  'inline': 'inline',
  'flex': 'flex',
  'inline-flex': 'inline-flex',
  'grid': 'grid',
  'inline-grid': 'inline-grid',
  'table': 'table',
  'table-cell': 'table-cell',
  'table-row': 'table-row',
  'none': 'hidden',
  'contents': 'contents',
  'list-item': 'list-item',
}

const POSITION_MAP: Record<string, string> = {
  static: 'static',
  fixed: 'fixed',
  absolute: 'absolute',
  relative: 'relative',
  sticky: 'sticky',
}

const OVERFLOW_MAP: Record<string, string> = {
  auto: 'overflow-auto',
  hidden: 'overflow-hidden',
  visible: 'overflow-visible',
  scroll: 'overflow-scroll',
  clip: 'overflow-clip',
}

const FONT_WEIGHT_MAP: Record<string, string> = {
  '100': 'font-thin',
  '200': 'font-extralight',
  '300': 'font-light',
  '400': 'font-normal',
  '500': 'font-medium',
  '600': 'font-semibold',
  '700': 'font-bold',
  '800': 'font-extrabold',
  '900': 'font-black',
}

const TEXT_ALIGN_MAP: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
  start: 'text-start',
  end: 'text-end',
}

const FLEX_DIRECTION_MAP: Record<string, string> = {
  row: 'flex-row',
  'row-reverse': 'flex-row-reverse',
  column: 'flex-col',
  'column-reverse': 'flex-col-reverse',
}

const ALIGN_ITEMS_MAP: Record<string, string> = {
  flex_start: 'items-start',
  'flex-start': 'items-start',
  flex_end: 'items-end',
  'flex-end': 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
}

const JUSTIFY_CONTENT_MAP: Record<string, string> = {
  flex_start: 'justify-start',
  'flex-start': 'justify-start',
  flex_end: 'justify-end',
  'flex-end': 'justify-end',
  center: 'justify-center',
  'space-between': 'justify-between',
  'space-around': 'justify-around',
  'space-evenly': 'justify-evenly',
  stretch: 'justify-stretch',
}

const FONT_SIZE_MAP: Record<number, string> = {
  12: 'text-xs',
  14: 'text-sm',
  16: 'text-base',
  18: 'text-lg',
  20: 'text-xl',
  24: 'text-2xl',
  30: 'text-3xl',
  36: 'text-4xl',
  48: 'text-5xl',
  60: 'text-6xl',
  72: 'text-7xl',
  96: 'text-8xl',
  128: 'text-9xl',
}

const OPACITY_MAP: Record<string, string> = {
  '0': 'opacity-0',
  '0.05': 'opacity-5',
  '0.1': 'opacity-10',
  '0.15': 'opacity-15',
  '0.2': 'opacity-20',
  '0.25': 'opacity-25',
  '0.3': 'opacity-30',
  '0.35': 'opacity-35',
  '0.4': 'opacity-40',
  '0.45': 'opacity-45',
  '0.5': 'opacity-50',
  '0.6': 'opacity-60',
  '0.7': 'opacity-70',
  '0.75': 'opacity-75',
  '0.8': 'opacity-80',
  '0.9': 'opacity-90',
  '0.95': 'opacity-95',
  '1': 'opacity-100',
}

// ─── Main property → Tailwind mappers ─────────────────────────────────

const PROPERTY_MAPPERS: Record<string, MappingFn> = {
  // Layout
  display: (v) => DISPLAY_MAP[v] || null,
  position: (v) => POSITION_MAP[v] || null,
  overflow: (v) => OVERFLOW_MAP[v] || null,
  'overflow-x': (v) => v === 'hidden' ? 'overflow-x-hidden' : v === 'auto' ? 'overflow-x-auto' : null,
  'overflow-y': (v) => v === 'hidden' ? 'overflow-y-hidden' : v === 'auto' ? 'overflow-y-auto' : null,

  // Sizing
  width: (v) => {
    if (v === '100%') return 'w-full'
    if (v === '100vw') return 'w-screen'
    if (v === 'auto') return 'w-auto'
    if (v === 'fit-content') return 'w-fit'
    if (v === 'min-content') return 'w-min'
    if (v === 'max-content') return 'w-max'
    return spacingClass('w', v)
  },
  height: (v) => {
    if (v === '100%') return 'h-full'
    if (v === '100vh') return 'h-screen'
    if (v === 'auto') return 'h-auto'
    if (v === 'fit-content') return 'h-fit'
    return spacingClass('h', v)
  },
  'min-width': (v) => v === '0px' ? null : spacingClass('min-w', v),
  'min-height': (v) => v === '0px' ? null : spacingClass('min-h', v),
  'max-width': (v) => {
    if (v === 'none') return null
    const BREAKPOINTS: Record<string, string> = {
      '640px': 'max-w-sm', '768px': 'max-w-md', '1024px': 'max-w-lg',
      '1280px': 'max-w-xl', '1536px': 'max-w-2xl',
    }
    return BREAKPOINTS[v] || spacingClass('max-w', v)
  },
  'max-height': (v) => v === 'none' ? null : spacingClass('max-h', v),

  // Spacing — shorthand
  margin: (v) => {
    if (v === '0px') return null
    if (v === 'auto') return 'm-auto'
    const parts = v.split(' ')
    if (parts.length === 1) return spacingClass('m', v)
    if (parts.length === 2 && parts[0] === parts[1]) return spacingClass('m', parts[0])
    return `m-[${v}]`
  },
  padding: (v) => {
    if (v === '0px') return null
    const parts = v.split(' ')
    if (parts.length === 1) return spacingClass('p', v)
    if (parts.length === 2 && parts[0] === parts[1]) return spacingClass('p', parts[0])
    return `p-[${v}]`
  },

  // Individual spacing
  'margin-top': (v) => v === '0px' ? null : spacingClass('mt', v),
  'margin-right': (v) => v === '0px' ? null : spacingClass('mr', v),
  'margin-bottom': (v) => v === '0px' ? null : spacingClass('mb', v),
  'margin-left': (v) => v === '0px' ? null : spacingClass('ml', v),
  'padding-top': (v) => v === '0px' ? null : spacingClass('pt', v),
  'padding-right': (v) => v === '0px' ? null : spacingClass('pr', v),
  'padding-bottom': (v) => v === '0px' ? null : spacingClass('pb', v),
  'padding-left': (v) => v === '0px' ? null : spacingClass('pl', v),

  // Position
  top: (v) => v === 'auto' ? null : spacingClass('top', v),
  right: (v) => v === 'auto' ? null : spacingClass('right', v),
  bottom: (v) => v === 'auto' ? null : spacingClass('bottom', v),
  left: (v) => v === 'auto' ? null : spacingClass('left', v),

  // Colors
  color: (v) => colorClass('text', v),
  'background-color': (v) => {
    if (v === 'rgba(0, 0, 0, 0)' || v === 'transparent') return 'bg-transparent'
    return colorClass('bg', v)
  },
  'border-color': (v) => colorClass('border', v),
  'outline-color': (v) => colorClass('outline', v),

  // Typography
  'font-size': (v) => {
    const px = parsePx(v)
    if (px && FONT_SIZE_MAP[px]) return FONT_SIZE_MAP[px]
    return v ? `text-[${v}]` : null
  },
  'font-weight': (v) => FONT_WEIGHT_MAP[v] || null,
  'font-family': (v) => {
    if (v.includes('sans')) return 'font-sans'
    if (v.includes('serif')) return 'font-serif'
    if (v.includes('mono')) return 'font-mono'
    return `font-['${v.split(',')[0].trim().replace(/['"]/g, '')}']`
  },
  'font-style': (v) => v === 'italic' ? 'italic' : v === 'normal' ? 'not-italic' : null,
  'line-height': (v) => {
    const lh: Record<string, string> = {
      '1': 'leading-none',
      '1.25': 'leading-tight',
      '1.375': 'leading-snug',
      '1.5': 'leading-normal',
      '1.625': 'leading-relaxed',
      '2': 'leading-loose',
    }
    return lh[v] || `leading-[${v}]`
  },
  'text-align': (v) => TEXT_ALIGN_MAP[v] || null,
  'text-decoration': (v) => {
    if (v.includes('underline')) return 'underline'
    if (v.includes('line-through')) return 'line-through'
    if (v.includes('none')) return 'no-underline'
    return null
  },
  'text-transform': (v) => ({
    uppercase: 'uppercase', lowercase: 'lowercase',
    capitalize: 'capitalize', none: 'normal-case',
  }[v] || null),
  'letter-spacing': (v) => {
    const ls: Record<string, string> = {
      '-0.05em': 'tracking-tighter', '-0.025em': 'tracking-tight',
      '0em': 'tracking-normal', '0.025em': 'tracking-wide',
      '0.05em': 'tracking-wider', '0.1em': 'tracking-widest',
    }
    return ls[v] || `tracking-[${v}]`
  },

  // Border
  'border-width': (v) => {
    const bw: Record<string, string> = { '0px': 'border-0', '1px': 'border', '2px': 'border-2', '4px': 'border-4', '8px': 'border-8' }
    return bw[v] || `border-[${v}]`
  },
  'border-style': (v) => v === 'none' ? 'border-none' : v === 'solid' ? 'border-solid' : v === 'dashed' ? 'border-dashed' : v === 'dotted' ? 'border-dotted' : null,
  'border-radius': (v) => {
    if (v === '0px') return 'rounded-none'
    if (v === '9999px' || v === '50%') return 'rounded-full'
    const br: Record<string, string> = {
      '2px': 'rounded-sm', '4px': 'rounded', '6px': 'rounded-md',
      '8px': 'rounded-lg', '12px': 'rounded-xl', '16px': 'rounded-2xl',
      '24px': 'rounded-3xl',
    }
    return br[v] || `rounded-[${v}]`
  },
  'border-top-left-radius': (v) => v === '0px' ? null : `rounded-tl-[${v}]`,
  'border-top-right-radius': (v) => v === '0px' ? null : `rounded-tr-[${v}]`,
  'border-bottom-left-radius': (v) => v === '0px' ? null : `rounded-bl-[${v}]`,
  'border-bottom-right-radius': (v) => v === '0px' ? null : `rounded-br-[${v}]`,

  // Shadow
  'box-shadow': (v) => {
    if (v === 'none') return 'shadow-none'
    const shadows: Record<string, string> = {
      '0 1px 2px 0 rgb(0 0 0 / 0.05)': 'shadow-sm',
      '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)': 'shadow',
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)': 'shadow-md',
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)': 'shadow-lg',
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)': 'shadow-xl',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)': 'shadow-2xl',
      'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)': 'shadow-inner',
    }
    return shadows[v] || `shadow-[${v.replace(/\s+/g, '_')}]`
  },

  // Opacity
  opacity: (v) => OPACITY_MAP[v] || `opacity-[${v}]`,

  // Flex
  'flex-direction': (v) => FLEX_DIRECTION_MAP[v] || null,
  'flex-wrap': (v) => ({ wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' }[v] || null),
  'align-items': (v) => ALIGN_ITEMS_MAP[v] || null,
  'justify-content': (v) => JUSTIFY_CONTENT_MAP[v] || null,
  'align-self': (v) => ({
    auto: 'self-auto', 'flex-start': 'self-start', 'flex-end': 'self-end',
    center: 'self-center', baseline: 'self-baseline', stretch: 'self-stretch',
  }[v] || null),
  flex: (v) => {
    if (v === '1 1 0%') return 'flex-1'
    if (v === '1 1 auto') return 'flex-auto'
    if (v === '0 0 auto') return 'flex-none'
    if (v === '1 0 0%') return 'grow'
    return null
  },
  gap: (v) => v === '0px' ? null : spacingClass('gap', v),
  'row-gap': (v) => v === '0px' ? null : spacingClass('gap-y', v),
  'column-gap': (v) => v === '0px' ? null : spacingClass('gap-x', v),

  // Z-index
  'z-index': (v) => {
    const zi: Record<string, string> = { '0': 'z-0', '10': 'z-10', '20': 'z-20', '30': 'z-30', '40': 'z-40', '50': 'z-50', 'auto': 'z-auto' }
    return zi[v] || `z-[${v}]`
  },

  // Visibility
  visibility: (v) => v === 'hidden' ? 'invisible' : v === 'visible' ? 'visible' : null,

  // Cursor
  cursor: (v) => {
    const cur: Record<string, string> = {
      auto: 'cursor-auto', default: 'cursor-default', pointer: 'cursor-pointer',
      wait: 'cursor-wait', text: 'cursor-text', move: 'cursor-move',
      'not-allowed': 'cursor-not-allowed', crosshair: 'cursor-crosshair', grab: 'cursor-grab',
    }
    return cur[v] || null
  },

  // White space
  'white-space': (v) => ({
    normal: 'whitespace-normal', nowrap: 'whitespace-nowrap',
    pre: 'whitespace-pre', 'pre-wrap': 'whitespace-pre-wrap', 'pre-line': 'whitespace-pre-line',
  }[v] || null),

  // Transform
  transform: (v) => v === 'none' ? null : `[transform:${v}]`,

  // Transition
  transition: (v) => {
    if (v === 'none' || v.includes('0s')) return null
    if (v.includes('all')) return 'transition-all'
    if (v.includes('color') || v.includes('background')) return 'transition-colors'
    if (v.includes('opacity')) return 'transition-opacity'
    if (v.includes('transform')) return 'transition-transform'
    return 'transition'
  },
}

// ─── Main export ─────────────────────────────────────────────────────

export function cssToTailwind(styles: CSSPropertyMap): TailwindResult {
  const classes: string[] = []
  const unmatched: CSSPropertyMap = {}
  let matched = 0
  let total = 0

  for (const [prop, value] of Object.entries(styles)) {
    if (!value) continue
    total++
    const mapper = PROPERTY_MAPPERS[prop]
    if (mapper) {
      const cls = mapper(value)
      if (cls) {
        classes.push(cls)
        matched++
      } else {
        unmatched[prop] = value
      }
    } else {
      unmatched[prop] = value
    }
  }

  return {
    classes: [...new Set(classes)],
    unmatched,
    matchRate: total === 0 ? 1 : matched / total,
  }
}
