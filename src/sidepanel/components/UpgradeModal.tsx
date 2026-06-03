import React from 'react'
import { X, Zap, Check, Star, ArrowRight, ExternalLink } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface UpgradeModalProps {
  onClose: () => void
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  const { t } = useI18n()

  const PRO_FEATURES = [
    { icon: '⚡', title: t('featUnlimited'),   desc: t('featUnlimitedDesc') },
    { icon: '🎨', title: t('featTailwind'),    desc: t('featTailwindDesc') },
    { icon: '⚛️',  title: t('featReactVue'),    desc: t('featReactVueDesc') },
    { icon: '🪙',  title: t('featTokens'),      desc: t('featTokensDesc') },
    { icon: '📸',  title: t('featScreenshot'),  desc: t('featScreenshotDesc') },
    { icon: '✏️',  title: t('featLiveCSS'),     desc: t('featLiveCSSDesc') },
    { icon: '🤖',  title: t('featAIFallback'),  desc: t('featAIFallbackDesc') },
    { icon: '🔄',  title: t('featUpdates'),     desc: t('featUpdatesDesc') },
  ]

  const handleUpgrade = () => {
    // Opens Creem.io payment link in a new tab
    chrome.tabs.create({ url: 'https://www.creem.io/payment/stylesnap-pro' })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-gray-900 rounded-t-2xl shadow-2xl border border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div className="relative px-5 pt-6 pb-5 bg-gradient-to-br from-indigo-900/80 via-purple-900/60 to-gray-900">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>

          {/* Badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              <Star size={10} fill="currentColor" />
              PRO
            </div>
          </div>

          {/* Price */}
          <h2 className="text-xl font-bold text-white mb-1">
            {t('upgradeModalTitle')}
          </h2>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-3xl font-extrabold text-white">$29</span>
            <span className="text-gray-400 text-sm mb-1 line-through">$69</span>
            <span className="text-green-400 text-sm mb-1 font-medium">{t('save')} $40</span>
          </div>
          <p className="text-xs text-gray-400">
            {t('oneTime')}
          </p>
        </div>

        {/* Feature list */}
        <div className="px-4 py-3 max-h-[45vh] overflow-y-auto space-y-1.5">
          {PRO_FEATURES.map((feat, i) => (
            <div key={i} className="flex items-start gap-3 py-1.5">
              <span className="text-base leading-none mt-0.5 flex-none">{feat.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-200">{feat.title}</div>
                <div className="text-[11px] text-gray-500 leading-relaxed">{feat.desc}</div>
              </div>
              <Check size={13} className="text-green-400 flex-none mt-0.5 ml-auto" />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-700 mx-4" />

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 px-4 py-2">
          {[t('secure'), t('instant'), t('lifetime')].map(badge => (
            <span key={badge} className="text-[10px] text-gray-500">{badge}</span>
          ))}
        </div>

        {/* CTA */}
        <div className="px-4 pb-5 pt-1 space-y-2">
          <button
            onClick={handleUpgrade}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/40 active:scale-[0.98]"
          >
            <Zap size={15} />
            {t('upgradeToPro')}
            <ArrowRight size={15} />
          </button>

          <button
            onClick={() => {
              chrome.tabs.create({ url: 'https://stylesnap.dev' })
              onClose()
            }}
            className="w-full py-2 text-gray-500 hover:text-gray-300 text-xs flex items-center justify-center gap-1 transition-colors"
          >
            <ExternalLink size={11} />
            {t('learnMore')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpgradeModal
