// ─────────────────────────────────────────────────────────────────────────────
// StyleSnap — Shared Types
// ─────────────────────────────────────────────────────────────────────────────

// ── CSS / Element ─────────────────────────────────────────────────────────────

export type CSSPropertyMap = Record<string, string>

export interface ParsedCSS {
  selector?: string
  styles: CSSPropertyMap
  /** Clean HTML of the element (events stripped) */
  html?: string
  /** Recursive component CSS (child elements included) */
  componentCSS?: string
  tailwindClasses?: string[]
  tailwindMatchRate?: number
}

export interface ElementInfo {
  tagName: string
  id: string
  classList: string[]
  selector: string
  rect: { width: number; height: number; top: number; left: number }
  computedStyles: CSSPropertyMap
}

// ── Design Tokens ─────────────────────────────────────────────────────────────

export interface ColorToken {
  name: string
  value: string       // hex
  rgb?: string
  hsl?: string
  usageCount: number
  role: 'primary' | 'secondary' | 'accent' | 'neutral' | 'background' | 'text' | 'border' | 'other'
}

export interface TypographyToken {
  family: string
  sizes: string[]     // ["14px", "16px", …]
  weights: string[]
  usageCount: number
}

export interface SpacingToken {
  name?: string
  value: string       // e.g. "8px"
  usageCount: number
}

export interface RadiusToken {
  name?: string
  value: string       // e.g. "4px"
  usageCount: number
}

export interface ShadowToken {
  name?: string
  value: string
  usageCount: number
}

export interface DesignTokens {
  colors:   ColorToken[]
  fonts:    TypographyToken[]
  spacing:  SpacingToken[]
  radii:    RadiusToken[]
  shadows:  ShadowToken[]
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export type MessageType =
  | 'INIT_INSPECTOR'
  | 'DISABLE_INSPECTOR'
  | 'ELEMENT_HOVERED'
  | 'ELEMENT_CLICKED'
  | 'EDIT_CSS'
  | 'EXTRACT_TOKENS'
  | 'TOKENS_RESULT'
  | 'CAPTURE_SCREENSHOT'
  | 'SCREENSHOT_RESULT'
  | 'CHECK_LICENSE'
  | 'LICENSE_STATUS'
  | 'GET_TAB_INFO'
  | 'COLLECT_ELEMENTS'

export interface Message<T = unknown> {
  type: MessageType
  payload?: T
  tabId?: number
}

// ── License ───────────────────────────────────────────────────────────────────

export interface LicenseStatus {
  isPro:       boolean
  dailyUsed:   number
  dailyLimit:  number
  email?:      string
  licenseKey?: string
}

// ── User Settings ─────────────────────────────────────────────────────────────

export interface UserSettings {
  theme:       'light' | 'dark' | 'system'
  defaultTab:  'inspect' | 'export' | 'tokens'
  showOverlay: boolean
  autoInspect: boolean
  copySound:   boolean
  aiApiKey:    string
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme:       'dark',
  defaultTab:  'inspect',
  showOverlay: true,
  autoInspect: false,
  copySound:   false,
  aiApiKey:    '',
}

export interface StoredData {
  license:  LicenseStatus
  settings: UserSettings
}
