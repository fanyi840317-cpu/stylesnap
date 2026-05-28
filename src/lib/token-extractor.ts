/**
 * Design Token Extractor
 * Scans entire page DOM and extracts a structured design token system
 */
import type { ColorToken, DesignTokens, TypographyToken, SpacingToken, RadiusToken, ShadowToken } from '@/shared/types'

// ─── Color utilities ─────────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')
}

function parseColor(value: string): { r: number; g: number; b: number; a: number } | null {
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return null

  let m = value.match(/^rgb\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\)$/)
  if (m) return { r: parseFloat(m[1]), g: parseFloat(m[2]), b: parseFloat(m[3]), a: 1 }

  m = value.match(/^rgba\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*([\d.]+)\)$/)
  if (m) {
    const a = parseFloat(m[4])
    if (a === 0) return null
    return { r: parseFloat(m[1]), g: parseFloat(m[2]), b: parseFloat(m[3]), a }
  }

  if (value.startsWith('#')) {
    const hex = value.slice(1)
    if (hex.length === 3) {
      return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16), a: 1 }
    }
    if (hex.length === 6) {
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: 1 }
    }
  }

  return null
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function colorDistance(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  return Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2))
}

// Group similar colors (within threshold)
function clusterColors(colors: Array<{ color: { r: number; g: number; b: number; a: number }; selector: string }>): ColorToken[] {
  const clusters: Array<{ center: { r: number; g: number; b: number; a: number }; members: typeof colors }> = []
  const THRESHOLD = 20

  for (const item of colors) {
    let nearest = -1
    let minDist = Infinity

    for (let i = 0; i < clusters.length; i++) {
      const dist = colorDistance(item.color, clusters[i].center)
      if (dist < minDist) {
        minDist = dist
        nearest = i
      }
    }

    if (nearest >= 0 && minDist < THRESHOLD) {
      clusters[nearest].members.push(item)
      // Update center to mean
      const m = clusters[nearest].members
      clusters[nearest].center = {
        r: m.reduce((s, x) => s + x.color.r, 0) / m.length,
        g: m.reduce((s, x) => s + x.color.g, 0) / m.length,
        b: m.reduce((s, x) => s + x.color.b, 0) / m.length,
        a: m.reduce((s, x) => s + x.color.a, 0) / m.length,
      }
    } else {
      clusters.push({ center: { ...item.color }, members: [item] })
    }
  }

  return clusters
    .filter(c => c.members.length >= 1)
    .sort((a, b) => b.members.length - a.members.length)
    .map((c, i) => {
      const { r, g, b } = c.center
      const hex = rgbToHex(r, g, b)
      const [h, s, l] = rgbToHsl(r, g, b)

      // Determine role
      let role: ColorToken['role'] = 'other'
      if (l > 90) role = 'background'
      else if (l < 10) role = 'text'
      else if (s < 10) role = 'neutral'
      else if (i === 0) role = 'primary'
      else if (i === 1) role = 'secondary'
      else role = 'accent'

      return {
        name: `color-${i + 1}`,
        value: hex,
        rgb: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
        hsl: `hsl(${h}, ${s}%, ${l}%)`,
        usageCount: c.members.length,
        role,
      }
    })
}

// ─── Font utilities ───────────────────────────────────────────────────

function normalizeFontFamily(ff: string): string {
  return ff.split(',')[0].trim().replace(/['"]/g, '')
}

// ─── Spacing utilities ────────────────────────────────────────────────

function parsePx(val: string): number | null {
  const m = val.match(/^([\d.]+)px$/)
  return m ? parseFloat(m[1]) : null
}

// ─── Main extractor ───────────────────────────────────────────────────

interface RawColorEntry {
  color: { r: number; g: number; b: number; a: number }
  selector: string
}

export function extractDesignTokens(): DesignTokens {
  const colorEntries: RawColorEntry[] = []
  const fontFamilies = new Map<string, { sizes: Map<string, { lh: string; ls: string; count: number }>; weights: Set<string>; count: number }>()
  const spacingValues = new Map<number, number>()
  const borderRadiusValues = new Map<number, number>()
  const shadowValues = new Map<string, number>()

  const getSelector = (el: Element): string => {
    if (el.id) return `#${el.id}`
    const classes = Array.from(el.classList).slice(0, 2).join('.')
    return classes ? `.${classes}` : el.tagName.toLowerCase()
  }

  // Traverse all visible elements
  const allElements = document.querySelectorAll('*')

  for (const el of Array.from(allElements)) {
    // Skip hidden, script, style elements
    const tag = el.tagName.toLowerCase()
    if (['script', 'style', 'noscript', 'meta', 'link', 'head'].includes(tag)) continue

    const computed = window.getComputedStyle(el)
    const selector = getSelector(el)

    // Colors
    const colorProps = ['color', 'background-color', 'border-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'outline-color', 'fill', 'stroke']
    for (const prop of colorProps) {
      const val = computed.getPropertyValue(prop)
      if (val) {
        const parsed = parseColor(val)
        if (parsed) colorEntries.push({ color: parsed, selector })
      }
    }

    // Typography
    const fontFamily = normalizeFontFamily(computed.fontFamily)
    const fontSize = computed.fontSize
    const fontWeight = computed.fontWeight
    const lineHeight = computed.lineHeight
    const letterSpacing = computed.letterSpacing

    if (fontFamily && fontSize) {
      if (!fontFamilies.has(fontFamily)) {
        fontFamilies.set(fontFamily, { sizes: new Map(), weights: new Set(), count: 0 })
      }
      const ff = fontFamilies.get(fontFamily)!
      ff.count++
      ff.weights.add(fontWeight)
      const sizeKey = fontSize
      if (!ff.sizes.has(sizeKey)) {
        ff.sizes.set(sizeKey, { lh: lineHeight, ls: letterSpacing, count: 0 })
      }
      ff.sizes.get(sizeKey)!.count++
    }

    // Spacing
    const spacingProps = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap', 'row-gap', 'column-gap']
    for (const prop of spacingProps) {
      const val = computed.getPropertyValue(prop)
      const px = parsePx(val)
      if (px !== null && px > 0 && px <= 200) {
        spacingValues.set(px, (spacingValues.get(px) || 0) + 1)
      }
    }

    // Border radius
    const radiusProps = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius']
    for (const prop of radiusProps) {
      const val = computed.getPropertyValue(prop)
      const px = parsePx(val)
      if (px !== null && px > 0) {
        borderRadiusValues.set(px, (borderRadiusValues.get(px) || 0) + 1)
      }
    }

    // Shadows
    const shadow = computed.boxShadow
    if (shadow && shadow !== 'none') {
      shadowValues.set(shadow, (shadowValues.get(shadow) || 0) + 1)
    }
  }

  // Compile colors
  const colors = clusterColors(colorEntries)
    .slice(0, 20) // Top 20 colors

  // Compile typography
  const fonts: TypographyToken[] = Array.from(fontFamilies.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([ff, data]) => ({
      family: ff,
      usageCount: data.count,
      weights: Array.from(data.weights).sort(),
      sizes: Array.from(data.sizes.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([size]) => size),
    }))

  // Compile spacing — top values sorted
  const spacing: SpacingToken[] = Array.from(spacingValues.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => a[0] - b[0])
    .map(([px, count]) => ({ value: `${px}px`, usageCount: count }))

  // Border radius
  const radii: RadiusToken[] = Array.from(borderRadiusValues.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([px, count]) => ({ value: `${px}px`, usageCount: count }))

  // Shadows
  const shadows: ShadowToken[] = Array.from(shadowValues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, usageCount]) => ({ value, usageCount }))

  return { colors, fonts, spacing, radii, shadows }
}

// ─── Export formatters ────────────────────────────────────────────────

export function tokensToJSON(tokens: DesignTokens): string {
  const output: Record<string, unknown> = {
    '$schema': 'https://design-tokens.github.io/community-group/format/',
    colors: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {},
  }

  // Colors
  const colors = output.colors as Record<string, unknown>
  for (const c of tokens.colors) {
    colors[c.name] = {
      $value: c.value,
      $type: 'color',
      $description: `${c.role} | used ${c.usageCount}×`,
    }
  }

  // Typography
  const typo = output.typography as Record<string, unknown>
  for (const t of tokens.fonts) {
    typo[t.family.replace(/\s+/g, '-').toLowerCase()] = {
      $value: t.family,
      $type: 'fontFamily',
      sizes: t.sizes,
      weights: t.weights,
    }
  }

  // Spacing
  const sp = output.spacing as Record<string, unknown>
  for (const s of tokens.spacing) {
    const key = s.name ?? `space-${s.value.replace('px', '')}`
    sp[key] = { $value: s.value, $type: 'dimension' }
  }

  // Border radius
  const br = output.borderRadius as Record<string, unknown>
  for (const r of tokens.radii) {
    const key = r.name ?? `radius-${r.value.replace('px', '')}`
    br[key] = { $value: r.value, $type: 'dimension' }
  }

  // Shadows
  const sh = output.shadows as Record<string, unknown>
  tokens.shadows.forEach((s, i) => {
    sh[s.name ?? `shadow-${i + 1}`] = { $value: s.value, $type: 'shadow' }
  })

  return JSON.stringify(output, null, 2)
}

export function tokensToTailwindConfig(tokens: DesignTokens): string {
  const colorLines = tokens.colors
    .map(c => `    '${c.name}': '${c.value}',`)
    .join('\n')

  const spacingLines = tokens.spacing
    .map(s => `    '${s.value.replace('px', '')}': '${s.value}',`)
    .join('\n')

  const fontFamilyLines = tokens.fonts
    .map(t => `    '${t.family.replace(/\s+/g, '-').toLowerCase()}': ['${t.family}', 'sans-serif'],`)
    .join('\n')

  const radiusLines = tokens.radii
    .map(r => `    '${r.value.replace('px', '')}': '${r.value}',`)
    .join('\n')

  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
${colorLines}
      },
      spacing: {
${spacingLines}
      },
      fontFamily: {
${fontFamilyLines}
      },
      borderRadius: {
${radiusLines}
      },
    },
  },
  plugins: [],
}
`
}

export function tokensToCSSVariables(tokens: DesignTokens): string {
  const lines: string[] = [':root {']

  lines.push('  /* ── Colors ── */')
  tokens.colors.forEach(c => {
    lines.push(`  --color-${c.name}: ${c.value}; /* ${c.role} */`)
  })

  lines.push('\n  /* ── Typography ── */')
  tokens.fonts.forEach((t, i) => {
    lines.push(`  --font-${i + 1}: '${t.family}';`)
  })

  lines.push('\n  /* ── Spacing ── */')
  tokens.spacing.forEach(s => {
    lines.push(`  --space-${s.value.replace('px', '')}: ${s.value};`)
  })

  lines.push('\n  /* ── Border Radius ── */')
  tokens.radii.forEach(r => {
    lines.push(`  --radius-${r.value.replace('px', '')}: ${r.value};`)
  })

  lines.push('}')
  return lines.join('\n')
}
