import React, { useState, useEffect } from 'react'
import { X, Key, Moon, Sun, Monitor, Trash2, Check, AlertCircle } from 'lucide-react'
import { getSettings, saveSettings, getLicenseStatus, activateLicense } from '../../lib/license'
import type { UserSettings, LicenseStatus } from '../../shared/types'
import { useI18n } from '@/lib/i18n'

interface SettingsModalProps {
  onClose: () => void
}

type ThemeOption = 'light' | 'dark' | 'system'

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { t } = useI18n()

  const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: 'light',  label: t('light'),  icon: <Sun size={14} /> },
    { value: 'dark',   label: t('dark'),   icon: <Moon size={14} /> },
    { value: 'system', label: t('system'), icon: <Monitor size={14} /> },
  ]
  const [settings, setSettings]     = useState<UserSettings | null>(null)
  const [license, setLicense]       = useState<LicenseStatus | null>(null)
  const [email, setEmail]           = useState('')
  const [activating, setActivating] = useState(false)
  const [activateResult, setActivateResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saved, setSaved]           = useState(false)

  useEffect(() => {
    Promise.all([getSettings(), getLicenseStatus()]).then(([s, l]) => {
      setSettings(s)
      setLicense(l)
    })
  }, [])

  const handleTheme = (theme: ThemeOption) => {
    if (!settings) return
    setSettings({ ...settings, theme })
  }

  const handleToggle = (key: keyof UserSettings) => {
    if (!settings) return
    setSettings({ ...settings, [key]: !settings[key as keyof UserSettings] })
  }

  const handleApiKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return
    setSettings({ ...settings, aiApiKey: e.target.value })
  }

  const handleSave = async () => {
    if (!settings) return
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleActivate = async () => {
    const e = email.trim()
    if (!e) return
    setActivating(true)
    setActivateResult(null)
    const ok = await activateLicense(e)
    setActivateResult(ok
      ? { ok: true,  msg: t('activateSuccess') }
      : { ok: false, msg: t('activateFail') })
    if (ok) {
      const l = await getLicenseStatus()
      setLicense(l)
    }
    setActivating(false)
  }

  const handleDeactivate = async () => {
    await chrome.storage.local.remove('stylesnap_license')
    const l = await getLicenseStatus()
    setLicense(l)
    setEmail('')
    setActivateResult(null)
  }

  if (!settings || !license) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-gray-900 rounded-xl p-6 text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="w-full max-w-sm bg-gray-900 rounded-t-2xl shadow-2xl border border-gray-700 pb-safe"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">{t('settings')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] px-4 py-3 space-y-5">

          {/* ── License ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t('license')}
            </h3>
            {license.isPro ? (
              <div className="flex items-center justify-between bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-400" />
                  <span className="text-xs text-green-300 font-medium">{t('proActivated')}</span>
                </div>
                <button
                  onClick={handleDeactivate}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  {t('remove')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
                  />
                  <button
                    onClick={handleActivate}
                    disabled={activating || !email.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors font-medium"
                  >
                    {activating ? t('activating') : t('activate')}
                  </button>
                </div>
                {activateResult && (
                  <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                    activateResult.ok
                      ? 'bg-green-900/20 text-green-300 border border-green-700/30'
                      : 'bg-red-900/20 text-red-300 border border-red-700/30'
                  }`}>
                    {activateResult.ok ? <Check size={12} className="mt-0.5 flex-none" /> : <AlertCircle size={12} className="mt-0.5 flex-none" />}
                    {activateResult.msg}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Theme ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t('theme')}
            </h3>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleTheme(opt.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-colors ${
                    settings.theme === opt.value
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── AI Code Generation ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t('aiCode')}
              <span className="ml-2 text-[10px] font-normal text-indigo-400 normal-case bg-indigo-900/30 px-1.5 py-0.5 rounded">Pro</span>
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              {t('aiCodeDesc')}
            </p>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2">
              <Key size={13} className="text-gray-500 flex-none" />
              <input
                type="password"
                value={settings.aiApiKey || ''}
                onChange={handleApiKey}
                placeholder="sk-…"
                className="flex-1 bg-transparent text-xs font-mono text-gray-200 placeholder-gray-600 outline-none"
              />
            </div>
          </section>

          {/* ── Behavior toggles ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t('behavior')}
            </h3>
            <div className="space-y-1">
              <Toggle
                label={t('showOverlay')}
                value={settings.showOverlay}
                onChange={() => handleToggle('showOverlay')}
              />
              <Toggle
                label={t('autoInspect')}
                value={settings.autoInspect}
                onChange={() => handleToggle('autoInspect')}
              />
              <Toggle
                label={t('copySound')}
                value={settings.copySound}
                onChange={() => handleToggle('copySound')}
              />
            </div>
          </section>

          {/* ── Usage ── */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t('usage')}
            </h3>
            <div className="bg-gray-800 rounded-lg px-3 py-2">
              {license.isPro ? (
                <span className="text-xs text-green-400">{t('unlimited')}</span>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{t('freeTier')}</span>
                    <span>{license.dailyUsed} / {license.dailyLimit} {t('extractions')}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (license.dailyUsed / license.dailyLimit) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saved ? <><Check size={14} /> {t('saved')}</> : t('saveSettings')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toggle helper ────────────────────────────────────────────────────────────
const Toggle: React.FC<{ label: string; value: boolean; onChange: () => void }> = ({
  label, value, onChange,
}) => (
  <div className="flex items-center justify-between py-1.5 px-1">
    <span className="text-xs text-gray-300">{label}</span>
    <button
      onClick={onChange}
      className={`relative w-8 h-4 rounded-full transition-colors ${
        value ? 'bg-indigo-500' : 'bg-gray-600'
      }`}
      role="switch"
      aria-checked={value}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
)

export default SettingsModal
