/**
 * Export Worker — Off main-thread code generation
 *
 * Uses shared css-utils.js for CSS→Tailwind mapping.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateReactComponent, generateVueComponent } = (globalThis as any).require('./shared/css-utils.js') as {
  generateReactComponent: (html: string, css: Record<string, string>, opts?: { styleMode?: string }) => string
  generateVueComponent: (html: string, css: Record<string, string>, opts?: { styleMode?: string }) => string
}

// ─── Types ─────────────────────────────────────────
interface WorkerInput {
  html: string
  css: Record<string, string>
  language: 'css' | 'jsx' | 'tsx' | 'vue' | 'js'
  options?: {
    styleMode?: 'tailwind' | 'css' | 'scoped'
    componentName?: string
  }
}

interface WorkerOutput {
  code: string
  language: string
}

// ─── Message handler ────────────────────────────────
self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { html, css, language, options = {} } = e.data
  let code = ''
  const lang = language === 'js' ? 'jsx' : language

  try {
    switch (language) {
      case 'css':
        code = Object.entries(css || {})
          .map(([k, v]) => `  ${k}: ${v};`)
          .join('\n')
        code = `.${(options.componentName || 'component').replace(/\s+/g, '-').toLowerCase()} {\n${code}\n}`
        break

      case 'jsx':
      case 'tsx':
        code = generateReactComponent(html, css, options)
        break

      case 'vue':
        code = generateVueComponent(html, css, options)
        break

      case 'js':
        code = generateReactComponent(html, css, options)
        break

      default:
        code = generateReactComponent(html, css, options)
    }
  } catch (err) {
    code = `// Error generating ${language} code:\n// ${(err as Error).message}\n\n${html || ''}`
  }

  const output: WorkerOutput = { code, language: lang }
  self.postMessage(output)
}
