# StyleSnap — CSS Inspector & Design Token Exporter

> **The complete design extraction workflow** — hover, click, copy. No more hunting through DevTools.

[![Version](https://img.shields.io/badge/version-1.0.0-indigo)](https://github.com/fanyi840317-cpu/stylesnap/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Edge Add-ons](https://img.shields.io/badge/Edge-Add--ons-blue)](https://microsoftedge.microsoft.com/addons)

---

## What is StyleSnap?

StyleSnap is a browser extension that lets you extract CSS styles, convert them to Tailwind classes / React / Vue components, and export your entire design token system — all without leaving the page.

**Free tier:** 20 extractions/day with CSS copy  
**Pro ($29 one-time):** Unlimited + Tailwind export + React/Vue codegen + Design tokens + Screenshot annotator

---

## Features

| Feature | Free | Pro |
|---------|------|-----|
| Hover inspect with overlay | ✅ | ✅ |
| Copy CSS properties | ✅ | ✅ |
| Raw CSS view | ✅ | ✅ |
| Tailwind class export | — | ✅ |
| React component generation | — | ✅ |
| Vue SFC generation | — | ✅ |
| CSS Module export | ✅ | ✅ |
| Design token extraction | — | ✅ |
| W3C token JSON export | — | ✅ |
| Tailwind config export | — | ✅ |
| CSS variables export | — | ✅ |
| Annotated screenshot | — | ✅ |
| Live CSS editing | — | ✅ |
| Unlimited extractions | — | ✅ |

---

## Why StyleSnap?

| Tool | Price | Tailwind | Design Tokens | Code Gen | Buy Once |
|------|-------|----------|---------------|----------|----------|
| CSS Scan | $69 | ❌ | ❌ | ❌ | ✅ |
| Pluck | $10/mo | ❌ | ❌ | ❌ | ❌ |
| Tailscan | $49 | ✅ | ❌ | ❌ | ✅ |
| **StyleSnap** | **$29** | **✅** | **✅** | **✅** | **✅** |

StyleSnap is the only tool that closes the **full loop**: extract → edit → export to your tech stack.

---

## Installation

### From Edge Add-ons Store
*(Coming soon)*

### Manual / Development
```bash
git clone https://github.com/fanyi840317-cpu/stylesnap.git
cd stylesnap
npm install
npm run build
```

1. Open Edge → `edge://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

---

## Development

```bash
npm install        # Install dependencies
npm run dev        # Development build with HMR (Vite + CRXJS)
npm run build      # Production build → dist/
npm run type-check # TypeScript check only
```

**Tech stack:**
- Manifest V3 + Side Panel API
- Vite + CRXJS (HMR in development)
- React 18 + TypeScript
- Tailwind CSS (UI)
- Deterministic CSS → Tailwind mapping (300+ rules, zero AI dependency)

---

## Architecture

```
src/
├── background/     # Service Worker: icon click, message relay, screenshots
├── content/        # Content Script: element inspection, CSS extraction, overlay
├── sidepanel/      # React UI: Inspect / Export / Tokens tabs
│   ├── tabs/       # InspectTab, ExportTab, TokensTab
│   └── components/ # CodeBlock, PropertyRow, SettingsModal, UpgradeModal
├── lib/            # Core libraries (framework-agnostic)
│   ├── css-extractor.ts    # getComputedStyle() → ParsedCSS
│   ├── tailwind-mapper.ts  # CSS → Tailwind (300+ rules)
│   ├── token-extractor.ts  # Full-page design token extraction
│   ├── code-generator.ts   # CSS → React/Vue component
│   ├── annotator.ts        # Screenshot annotation
│   └── license.ts          # Free/Pro license management
└── shared/
    ├── types.ts     # Shared TypeScript types
    └── constants.ts # Storage keys, limits, config
```

---

## License

MIT © 2024 StyleSnap Contributors  
See [LICENSE](LICENSE) for details.

---

## Get Pro

👉 **$29 one-time** — [stylesnap.dev](https://stylesnap.dev)

- Lifetime access, no subscription
- All future updates included
- Secure checkout via Creem.io
