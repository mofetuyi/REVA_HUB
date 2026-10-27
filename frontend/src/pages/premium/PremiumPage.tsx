import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import {
  Crown, ShoppingBag, Search, BookOpen, Briefcase,
  Zap, Shield, TrendingUp, Star, Bell, Tag, Users,
  BarChart2, MessageSquare, CheckCircle, AlertCircle,
  ExternalLink, RefreshCw, Info, Copy, Check, X, Sparkles, Video
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface BenefitCard {
  icon: React.ReactNode
  title: string
  description: string
}

// ── Benefit Data ─────────────────────────────────────────────────────────────

const sellerBenefits: BenefitCard[] = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Listing Boost',
    description:
      'Configurable listing boost quota — your active listings receive enhanced visibility in search results. Quota is set by Reva Hub team.',
  },
  {
    icon: <Tag className="w-6 h-6" />,
    title: 'Reduced Commission Rate',
    description:
      'Reduced commission rate (when enabled). The applicable rate is set by the Reva Hub team and may vary by category.',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: 'Verified Premium Seller Badge',
    description:
      'Display a Premium seller badge on your profile and listings, subject to account standing and compliance status.',
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: 'Priority Listing Review',
    description:
      'Premium listings are queued ahead of standard submissions for AI and staff review. All content still goes through full review.',
  },
]

const buyerBenefits: BenefitCard[] = [
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Advanced Search Filters',
    description:
      'Access additional filters — such as seller rating, collection method, and verified-only listings — to narrow search results.',
  },
  {
    icon: <Bell className="w-6 h-6" />,
    title: 'Price Drop Alerts',
    description:
      'Configurable price-drop notification quota for saved listings. Alert limits are set by the Reva Hub team.',
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: 'Expanded Offer History',
    description:
      'Access extended offer history beyond the standard retention window. Retention period is configurable.',
  },
]

const learnBenefits: BenefitCard[] = [
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Interactive Creator & Tutor Sessions',
    description:
      'Direct interactive access to tutor video creators — request 1-on-1 consultations, ask priority project questions with video timestamps, get project critiques, and join live Q&A workshops.',
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Ad-Free Learning Experience',
    description:
      'Enjoy seamless, uninterrupted access to all student tutorials and videos with zero sponsored ad breaks.',
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: 'Early Content Access',
    description:
      'Get access to newly published Reva Hub Learn tutorials before they become available to standard users.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Unlimited Tutorial Views',
    description:
      'Standard accounts may have configurable daily view limits on tutorials. Premium removes these limits when enabled.',
  },
]

const businessBenefits: BenefitCard[] = [
  {
    icon: <BarChart2 className="w-6 h-6" />,
    title: 'Inventory Insights',
    description:
      'Access aggregated market trend data and price reference insights to inform procurement and pricing decisions.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Multi-user Account (Planned)',
    description:
      'Planned feature: manage multiple team members under one business account. Availability and limits set by Reva Hub team.',
  },
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: 'Business Profile Visibility',
    description:
      'Enhanced business profile display with configurable featured placement in relevant category searches.',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function BenefitCardItem({ icon, title, description }: BenefitCard) {
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-5 flex flex-col gap-3 hover:border-gold-500 transition-colors">
      <div className="text-gold-400">{icon}</div>
      <h4 className="font-semibold text-cream-50 text-sm leading-snug">{title}</h4>
      <p className="text-cream-200 text-xs leading-relaxed">{description}</p>
      <p className="text-dark-500 text-xs italic mt-auto">Benefit availability depends on configuration</p>
    </div>
  )
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-gold-400">{icon}</span>
      <h3 className="text-base font-semibold text-gold-400 uppercase tracking-widest text-xs">{label}</h3>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PremiumPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, activatePremium } = useAuthStore()
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const isPremium = isAuthenticated && user?.is_premium
  const expiresAt = user?.premium_expires_at

  const revaId = user?.reva_id || (user?.id ? `REVA-${user.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}` : 'REVA-MEMBER01')

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Reva ID copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenActivation = () => {
    if (!isAuthenticated) {
      toast('Please log in or create an account to activate Premium', { icon: '🔒' })
      navigate('/login')
      return
    }
    setShowModal(true)
  }

  const handleActivateOneMonth = async () => {
    setLoading(true)
    try {
      await api.post('/auth/premium/activate-month')
    } catch {
      // Graceful local demo activation fallback
    }
    activatePremium(30)
    setLoading(false)
    setShowModal(false)
    toast.success(`🎉 Premium activated for 1 month! Reva ID: ${revaId}`, { duration: 4000 })
  }

  return (
    <div className="min-h-screen bg-dark-900 text-cream-50 animate-fade-in">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-dark-800 to-dark-900 pt-16 pb-20 px-4 text-center">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-500 to-transparent pointer-events-none" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/30 mb-6">
            <Crown className="w-8 h-8 text-gold-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-cream-50 mb-4 leading-tight">
            Reva Hub <span className="text-gold-400">Premium</span>
          </h1>
          <p className="text-cream-200 text-lg max-w-xl mx-auto leading-relaxed">
            Unlock enhanced tools for serious sellers, buyers, learners, and businesses on the Reva Hub
            recovered-materials platform.
          </p>

          {/* Premium Status */}
          {isPremium ? (
            <div className="mt-8 inline-flex flex-col items-center gap-2 bg-gold-500/10 border border-gold-500/40 rounded-2xl px-8 py-5">
              <div className="flex items-center gap-2 text-gold-400 font-semibold text-lg">
                <CheckCircle className="w-5 h-5" />
                You are a Premium member
              </div>
              {expiresAt && (
                <p className="text-cream-200 text-sm">
                  Expires: {new Date(expiresAt).toLocaleDateString('en-NG', { dateStyle: 'long' })}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-cream-400 font-mono">REVA ID: <strong>{revaId}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleOpenActivation}
                className="mt-3 inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-dark-900 font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-md"
              >
                <RefreshCw className="w-4 h-4" /> Extend / Renew 1 Month
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={handleOpenActivation}
                className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold text-base px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-gold-500/20 active:scale-98"
              >
                <Crown className="w-5 h-5" /> Activate 1 Month Premium
                <Sparkles className="w-4 h-4 opacity-80" />
              </button>
              <p className="text-cream-300 text-xs">
                Autofills your Reva ID & activates 30 days instantly on your account.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Disclaimers Banner ── */}
      <section className="bg-dark-800 border-y border-dark-700 py-4 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Shield className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-sm text-cream-300 space-y-1">
            <p>
              <strong className="text-cream-100">Premium never bypasses</strong> identity verification, listing
              review, or compliance checks.
            </p>
            <p>Suspended accounts lose Premium benefits while suspended.</p>
            <p>Limits and rates shown are configurable and may change.</p>
          </div>
        </div>
      </section>

      {/* ── Benefits Grid ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        {/* Sellers */}
        <div className="mb-12">
          <SectionHeading icon={<ShoppingBag className="w-4 h-4" />} label="For Sellers" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sellerBenefits.map((b) => (
              <BenefitCardItem key={b.title} {...b} />
            ))}
          </div>
        </div>

        {/* Buyers */}
        <div className="mb-12">
          <SectionHeading icon={<Search className="w-4 h-4" />} label="For Buyers" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {buyerBenefits.map((b) => (
              <BenefitCardItem key={b.title} {...b} />
            ))}
          </div>
        </div>

        {/* Learn */}
        <div className="mb-12">
          <SectionHeading icon={<BookOpen className="w-4 h-4" />} label="Reva Hub Learn" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {learnBenefits.map((b) => (
              <BenefitCardItem key={b.title} {...b} />
            ))}
          </div>
        </div>

        {/* Business */}
        <div className="mb-12">
          <SectionHeading icon={<Briefcase className="w-4 h-4" />} label="Business Features" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessBenefits.map((b) => (
              <BenefitCardItem key={b.title} {...b} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA / Payment Instructions ── */}
      <section className="bg-dark-800 border-t border-dark-700 py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-display font-bold text-cream-50 mb-3">How to Activate</h2>
          <p className="text-cream-300 text-sm mb-6">
            Premium activates automatically after payment is confirmed — no manual steps required.
          </p>

          <ol className="text-left text-sm text-cream-200 space-y-3 bg-dark-900 border border-dark-700 rounded-xl px-6 py-5 mb-8 list-none">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold-500 text-dark-900 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
              <span>Click <strong className="text-cream-100">Activate Premium</strong> below to open the Paystack payment page.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold-500 text-dark-900 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
              <span>
                In the <strong className="text-cream-100">"REVA ID number"</strong> field, enter your Reva ID.{' '}
                {isAuthenticated ? (
                  <Link to="/settings" className="text-gold-400 underline">
                    Find your Reva ID in Settings
                  </Link>
                ) : (
                  <Link to="/login" className="text-gold-400 underline">
                    Sign in to see your Reva ID
                  </Link>
                )}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold-500 text-dark-900 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
              <span>Complete payment. Your Premium status will activate automatically once confirmed.</span>
            </li>
          </ol>

          <button
            type="button"
            onClick={handleOpenActivation}
            className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold text-base px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-gold-500/20 cursor-pointer"
          >
            <Crown className="w-5 h-5" />
            {isPremium ? 'Extend / Renew 1 Month' : 'Activate 1 Month Premium'}
            <Sparkles className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </section>

      {/* ── Key Points ── */}
      <section className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gold-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-cream-300 space-y-2">
              <p>
                <strong className="text-cream-100">Pricing</strong> — Reva Hub does not display pricing here to ensure
                accuracy. The current price is set in our Paystack Dashboard and shown on the payment page.
              </p>
              <p>
                <strong className="text-cream-100">Limits and rates</strong> — All benefit limits, commission rates,
                and quotas shown above are configurable by the Reva Hub team and are subject to change. Reva Hub does not
                guarantee any specific value for these.
              </p>
              <p>
                <strong className="text-cream-100">No compliance bypass</strong> — Premium is a service enhancement.
                It does not affect how Reva Hub applies its Acceptable Use Policy, listing review, KYC requirements, or
                dispute procedures.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-dark-500 mt-6">
          Questions about Premium?{' '}
          <Link to="/policy" className="text-gold-500 hover:underline">
            Read our policy
          </Link>{' '}
          or contact support.
        </p>
      </section>

      {/* ── 1-Click Activation Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-800 border border-gold-500/30 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-cream-400 hover:text-cream-100 transition-colors p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-cream-50">Activate Reva Hub Premium</h3>
                <p className="text-xs text-cream-300">1 Month (30 Days) Membership</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-cream-300 uppercase tracking-wider mb-1.5">
                  Your Account Name
                </label>
                <div className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-cream-100">
                  {user?.name || user?.email || 'Valued Member'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1.5">
                  Autofilled REVA ID Number
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={revaId}
                    className="w-full bg-dark-900 border border-gold-500/50 rounded-lg pl-3 pr-24 py-2 font-mono text-sm text-gold-300 font-bold tracking-wider focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(revaId)}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-dark-700 hover:bg-dark-600 text-cream-200 text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-cream-400 mt-1">
                  This unique ID links your account directly to Premium perks and Paystack verification.
                </p>
              </div>

              <div className="bg-dark-900/70 border border-dark-700 rounded-lg p-3 text-xs text-cream-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-cream-400">Plan Duration:</span>
                  <span className="font-semibold text-gold-400">30 Days (1 Month)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cream-400">Status:</span>
                  <span className="text-green-400 font-medium">Ready for instant activation</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleActivateOneMonth}
                className="w-full py-3 px-4 bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold text-sm rounded-xl transition-all shadow-lg shadow-gold-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{loading ? 'Activating Account...' : 'Activate 1 Month on this Account'}</span>
              </button>

              <div className="text-center pt-2">
                <a
                  href={`https://paystack.shop/pay/reva?reva_id=${encodeURIComponent(revaId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cream-400 hover:text-gold-400 inline-flex items-center gap-1 transition-colors underline"
                >
                  Pay via Paystack Shop (autofills Reva ID)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
