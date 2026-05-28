import React, { useState, useCallback } from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: 'css' | 'jsx' | 'tsx' | 'vue' | 'json' | 'js'
  title?: string
  collapsible?: boolean
  maxHeight?: number
  onCopy?: () => void
  className?: string
}

const LANGUAGE_LABELS: Record<string, string> = {
  css: 'CSS',
  jsx: 'JSX',
  tsx: 'TSX',
  vue: 'Vue',
  json: 'JSON',
  js: 'JavaScript',
}

/** Very lightweight syntax highlighter — no external dependency */
function highlight(code: string, language: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const raw = escape(code)

  if (language === 'css') {
    return raw
      // CSS comments
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
      // Selectors
      .replace(/^([^{}\n]+)(?=\s*\{)/gm, '<span class="hl-selector">$1</span>')
      // Property names
      .replace(/([\w-]+)(?=\s*:)/g, '<span class="hl-property">$1</span>')
      // Values (after colon)
      .replace(/:\s*([^;}\n]+)/g, ': <span class="hl-value">$1</span>')
      // Numbers + units
      .replace(/\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?\b)/g,
        '<span class="hl-number">$1</span>')
      // Hex colors
      .replace(/(#[0-9a-fA-F]{3,8})/g, '<span class="hl-color">$1</span>')
  }

  if (language === 'json') {
    return raw
      .replace(/"([^"]+)"(?=\s*:)/g, '<span class="hl-property">"$1"</span>')
      .replace(/:\s*"([^"]*)"/g, ': <span class="hl-string">"$1"</span>')
      .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span class="hl-number">$1</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="hl-keyword">$1</span>')
  }

  if (['jsx', 'tsx', 'vue', 'js'].includes(language)) {
    return raw
      // JSX/HTML comments
      .replace(/({\/\*[\s\S]*?\*\/}|&lt;!--[\s\S]*?--&gt;)/g,
        '<span class="hl-comment">$1</span>')
      // Strings
      .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*?`)/g,
        '<span class="hl-string">$1</span>')
      // JSX tags
      .replace(/(&lt;\/?)([\w.]+)/g,
        '$1<span class="hl-tag">$2</span>')
      // Keywords
      .replace(/\b(import|export|from|const|let|var|function|return|default|class|extends|if|else|for|while|of|in|new|typeof|async|await|=>)\b/g,
        '<span class="hl-keyword">$1</span>')
      // Numbers
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hl-number">$1</span>')
  }

  return raw
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'css',
  title,
  collapsible = false,
  maxHeight = 320,
  onCopy,
  className = '',
}) => {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: execCommand
      const el = document.createElement('textarea')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code, onCopy])

  const highlighted = highlight(code, language)

  return (
    <div className={`code-block rounded-lg overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-xs text-gray-400 font-medium truncate max-w-[160px]">
              {title}
            </span>
          )}
          <span className="text-[10px] text-indigo-400 bg-indigo-900/40 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
            {LANGUAGE_LABELS[language] ?? language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {collapsible && (
            <button
              onClick={() => setCollapsed(v => !v)}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors text-xs"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check size={12} className="text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      {!collapsed && (
        <div
          className="overflow-auto"
          style={{ maxHeight }}
        >
          <pre
            className="text-xs font-mono leading-relaxed p-3 m-0 text-gray-300 bg-gray-900 whitespace-pre"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      )}

      {/* Inline styles for highlights — scoped within .code-block */}
      <style>{`
        .code-block .hl-comment  { color: #6b7280; font-style: italic; }
        .code-block .hl-selector { color: #818cf8; }
        .code-block .hl-property { color: #93c5fd; }
        .code-block .hl-value    { color: #d1d5db; }
        .code-block .hl-number   { color: #fbbf24; }
        .code-block .hl-color    { color: #34d399; }
        .code-block .hl-string   { color: #86efac; }
        .code-block .hl-keyword  { color: #c084fc; }
        .code-block .hl-tag      { color: #f87171; }
      `}</style>
    </div>
  )
}

export default CodeBlock
