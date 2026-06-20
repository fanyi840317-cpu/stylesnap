// Type declarations for css-utils.js

export function cssToTailwind(css: Record<string, string>): {
  classes: string[]
  unmatched: Record<string, string>
}

export function generateReactComponent(
  html: string,
  css: Record<string, string>,
  opts?: { styleMode?: string }
): string

export function generateVueComponent(
  html: string,
  css: Record<string, string>,
  opts?: { styleMode?: string }
): string
