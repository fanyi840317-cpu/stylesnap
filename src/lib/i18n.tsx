import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'zh'

const translations = {
  en: {
    // App
    inspect: 'Inspect',
    export: 'Export',
    tokens: 'Tokens',
    startInspecting: 'Start Inspecting',
    inspecting: 'Inspecting… (ESC to stop)',
    freeQuota: 'Free: {used} / {limit} today',
    upgradeUnlimited: 'Upgrade for unlimited →',
    pro: 'Pro $29',
    settings: 'Settings',
    cannotInspect: 'Cannot inspect this page. Please try on a normal website.',
    failedConnect: 'Failed to connect to the page. Please refresh the page and try again.',
    // Inspect Tab
    emptyInspect1: 'Click <strong>Start Inspecting</strong> above<br/>or the floating button on the page<br/>then hover over any element',
    emptyInspect2: 'Hover over an element to inspect it',
    properties: 'Properties',
    rawCSS: 'Raw CSS',
    copyCSS: 'Copy CSS',
    copyTW: 'Copy Tailwind',
    upgradeToCopyTW: 'Upgrade to copy Tailwind classes',
    // Export Tab
    selectElement: 'Hover over an element and click to select it',
    useExport: 'Then use Export to generate component code',
    style: 'Style:',
    inline: 'Inline',
    proFeature: 'Pro feature',
    upgradeToUnlock: 'Upgrade to unlock {format} export.',
    upgrade: 'Upgrade',
    // Tokens Tab
    proTokenTitle: 'Pro feature — Design Token Extraction',
    proTokenDesc: 'Extract your entire design system: color palette, typography scale, spacing, and more.',
    extractTokensTitle: 'Extract Design Tokens',
    extractTokensDesc: 'Scan the current page to extract global colors, fonts, and spacing into standard formats.',
    scanning: 'Scanning page...',
    extractTokensBtn: 'Extract Tokens',
  },
  zh: {
    // App
    inspect: '审查',
    export: '导出',
    tokens: '变量',
    startInspecting: '开始审查',
    inspecting: '审查中… (按 ESC 停止)',
    freeQuota: '免费额度: {used} / {limit} (今日)',
    upgradeUnlimited: '升级无限制版本 →',
    pro: '专业版 $29',
    settings: '设置',
    cannotInspect: '无法审查此页面，请在普通网页上重试。',
    failedConnect: '连接页面失败。请刷新页面后重试。',
    // Inspect Tab
    emptyInspect1: '点击上方的 <strong>开始审查</strong><br/>或者网页右下角的悬浮按钮<br/>然后将鼠标悬停在任意元素上',
    emptyInspect2: '将鼠标悬停在元素上以查看样式',
    properties: '可视属性',
    rawCSS: '原始 CSS',
    copyCSS: '复制 CSS',
    copyTW: '复制 Tailwind',
    upgradeToCopyTW: '升级以复制 Tailwind 类名',
    // Export Tab
    selectElement: '将鼠标悬停在元素上并点击选择',
    useExport: '然后使用导出功能生成组件代码',
    style: '样式:',
    inline: '内联样式 (Inline)',
    proFeature: '专业版功能',
    upgradeToUnlock: '升级以解锁 {format} 代码导出。',
    upgrade: '升级',
    // Tokens Tab
    proTokenTitle: '专业版功能 — 设计变量提取',
    proTokenDesc: '一键提取整个网站的设计系统：调色板、排版字体、间距等。',
    extractTokensTitle: '提取设计变量 (Design Tokens)',
    extractTokensDesc: '扫描当前页面，提取颜色、字体、间距等全局设计规范，并导出为标准格式。',
    scanning: '正在扫描页面...',
    extractTokensBtn: '提取设计变量',
  }
}

type TranslationKey = keyof typeof translations.en

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    chrome.storage.local.get(['language']).then(res => {
      if (res.language === 'zh' || res.language === 'en') {
        setLangState(res.language)
      } else {
        const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en'
        setLangState(browserLang)
      }
    })
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    chrome.storage.local.set({ language: newLang })
  }

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    let str = translations[lang][key] || translations.en[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v))
      })
    }
    return str
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
