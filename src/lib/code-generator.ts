/**
 * Code Generator
 * Converts extracted CSS + HTML into React/Vue components
 */
import { CSSPropertyMap } from '@/shared/types'

// ─── React Component Generator ───────────────────────────────────────

interface ReactGenOptions {
  componentName?: string
  styleMode?: 'tailwind' | 'cssmodule' | 'inline'
  useModules?: boolean    // legacy alias for cssmodule
  tailwindClasses?: string[]
}

export function generateReactComponent(
  html: string,
  css: string,
  options: ReactGenOptions = {}
): string {
  const name = options.componentName || 'Component'
  const mode = options.styleMode ?? (options.useModules ? 'cssmodule' : 'inline')
  const classes = options.tailwindClasses || []

  if (mode === 'tailwind' && classes.length > 0) {
    return generateReactWithTailwind(name, html, classes)
  }
  if (mode === 'cssmodule') {
    return generateReactWithModules(name, html, css)
  }
  return generateReactWithInlineStyles(name, html, css)
}

function generateReactWithTailwind(name: string, html: string, classes: string[]): string {
  const jsxHtml = htmlToJSX(html)
  return `import React from 'react'

interface ${name}Props {
  children?: React.ReactNode
  className?: string
}

export const ${name}: React.FC<${name}Props> = ({ children, className }) => {
  return (
    <div className={\`${classes.join(' ')} \${className || ''}\`}>
      ${jsxHtml || '{children}'}
    </div>
  )
}

export default ${name}
`
}

function generateReactWithModules(name: string, html: string, css: string): string {
  const jsxHtml = htmlToJSX(html)
  return `import React from 'react'
import styles from './${name}.module.css'

interface ${name}Props {
  children?: React.ReactNode
  className?: string
}

export const ${name}: React.FC<${name}Props> = ({ children, className }) => {
  return (
    <div className={\`\${styles.root} \${className || ''}\`}>
      ${jsxHtml || '{children}'}
    </div>
  )
}

export default ${name}

// Save as ${name}.module.css:
/*
${css}
*/
`
}

function generateReactWithInlineStyles(name: string, html: string, css: string): string {
  const styles = cssStringToObject(css)
  const jsxHtml = htmlToJSX(html)
  const stylesStr = JSON.stringify(styles, null, 2)
    .replace(/"([^"]+)":/g, '$1:')

  return `import React from 'react'

interface ${name}Props {
  children?: React.ReactNode
  style?: React.CSSProperties
}

const ${name}Styles: React.CSSProperties = ${stylesStr}

export const ${name}: React.FC<${name}Props> = ({ children, style }) => {
  return (
    <div style={{ ...${name}Styles, ...style }}>
      ${jsxHtml || '{children}'}
    </div>
  )
}

export default ${name}
`
}

// ─── Vue Component Generator ─────────────────────────────────────────

interface VueGenOptions {
  componentName?: string
  styleMode?: 'tailwind' | 'cssmodule' | 'inline'
  tailwindClasses?: string[]
}

export function generateVueComponent(
  html: string,
  css: string,
  options: VueGenOptions = {}
): string {
  const name = options.componentName || 'MyComponent'
  const classes = options.tailwindClasses || []
  const template = classes.length > 0
    ? `  <div class="${classes.join(' ')}">\n    ${html.trim() || '<slot />'}\n  </div>`
    : `  <div class="root">\n    ${html.trim() || '<slot />'}\n  </div>`

  const scopedCss = classes.length > 0 ? '' : `\n<style scoped>\n.root {\n${formatCSSForScope(css)}\n}\n</style>`

  return `<!-- ${name}.vue -->
<template>
${template}
</template>

<script setup lang="ts">
interface Props {
  class?: string
}

const props = withDefaults(defineProps<Props>(), {})
</script>
${scopedCss}`
}

// ─── HTML utilities ───────────────────────────────────────────────────

function htmlToJSX(html: string): string {
  return html
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/tabindex=/g, 'tabIndex=')
    .replace(/readonly=/g, 'readOnly=')
    .replace(/maxlength=/g, 'maxLength=')
    .replace(/cellpadding=/g, 'cellPadding=')
    .replace(/cellspacing=/g, 'cellSpacing=')
    .replace(/rowspan=/g, 'rowSpan=')
    .replace(/colspan=/g, 'colSpan=')
    // Self-closing tags
    .replace(/<(input|img|br|hr|meta|link|area|base|col|embed|param|source|track|wbr)([^>]*?)(?<!\/)>/gi, '<$1$2 />')
    // Inline styles: style="..." → style={{ ... }}
    .replace(/style="([^"]*)"/g, (_m, styles) => {
      const obj = cssStringToObject(styles)
      const entries = Object.entries(obj).map(([k, v]) => `${camelCase(k)}: '${v}'`).join(', ')
      return `style={{ ${entries} }}`
    })
}

function cssStringToObject(css: string): CSSPropertyMap {
  const result: CSSPropertyMap = {}
  const lines = css.split(/[;\n]/).map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/;$/, '')
    if (key && value) {
      result[camelCase(key)] = value
    }
  }
  return result
}

function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function formatCSSForScope(css: string): string {
  return css.split('\n')
    .map(l => '  ' + l)
    .join('\n')
}

// ─── Responsive & Pseudo-class CSS Generators ──────────────────

/** Format responsiveStyles (from @media rules) into a CSS string */
export function formatResponsiveCSS(
  responsiveStyles: Record<string, CSSPropertyMap>,
  selector: string
): string {
  const blocks: string[] = []
  for (const [media, styles] of Object.entries(responsiveStyles)) {
    const props = Object.entries(styles)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')
    blocks.push(`${media} {\n  ${selector} {\n${props}\n  }\n}`)
  }
  return blocks.join('\n\n')
}

/** Format pseudoStyles (:hover etc.) into a CSS string */
export function formatPseudoCSS(
  pseudoStyles: Record<string, CSSPropertyMap>,
  selector: string
): string {
  const blocks: string[] = []
  for (const [pseudo, styles] of Object.entries(pseudoStyles)) {
    const props = Object.entries(styles)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n')
    blocks.push(`${selector}${pseudo} {\n${props}\n}`)
  }
  return blocks.join('\n\n')
}

/**
 * Generate additional CSS string (responsive + pseudo) to append to main CSS.
 * Used by the side panel when exporting code.
 */
export function generateAdditionalCSS(
  parsed: { responsiveStyles?: Record<string, CSSPropertyMap>; pseudoStyles?: Record<string, CSSPropertyMap>; selector?: string }
): string {
  const parts: string[] = []
  const selector = parsed.selector || '.element'
  if (parsed.responsiveStyles && Object.keys(parsed.responsiveStyles).length > 0) {
    parts.push(formatResponsiveCSS(parsed.responsiveStyles, selector))
  }
  if (parsed.pseudoStyles && Object.keys(parsed.pseudoStyles).length > 0) {
    parts.push(formatPseudoCSS(parsed.pseudoStyles, selector))
  }
  return parts.join('\n\n')
}
