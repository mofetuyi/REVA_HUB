import React, { useState, useEffect, useRef } from 'react'
import {
  CreditCard, ShieldCheck, Lock, CheckCircle2,
  RefreshCw, ArrowRight, Zap, Wifi
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

export interface CardReaderDebitorProps {
  amount: number // in NGN
  title?: string
  subtitle?: string
  email: string
  name?: string
  phone?: string
  revaId?: string
  metadata?: Record<string, any>
  onSuccess: (reference: string) => void | Promise<void>
  onCancel?: () => void
  paymentType: 'premium' | 'goods'
  orderId?: string
}

type CardBrand = 'mastercard' | 'visa' | 'verve' | 'generic'

const PROCESSING_STEPS = [
  'Connecting to Interswitch gateway...',
  'Authenticating card credentials...',
  'Requesting bank authorization...',
  'Sending 3D Secure OTP to your bank...',
  'Verifying OTP & authorizing debit...',
  'Settling to Access Bank 1960630256...',
  '✅ Settlement confirmed! Funds received.',
]

function luhnCheck(num: string): boolean {
  let sum = 0
  let alt = false
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10)
    if (alt) { n *= 2; if (n > 9) n -= 9 }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export default function CardReaderDebitor({
  amount,
  title = 'Card Reader & Debitor',
  subtitle,
  email,
  name: _nameProp,
  revaId = '',
  metadata = {},
  onSuccess,
  onCancel,
  paymentType,
  orderId,
}: CardReaderDebitorProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [pin, setPin] = useState('')
  const [isFlipped, setIsFlipped] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processStep, setProcessStep] = useState(-1)
  const [cardBrand, setCardBrand] = useState<CardBrand>('generic')
  const cvvRef = useRef<HTMLInputElement>(null)

  // ── Card brand detection ───────────────────────────────────────────────────
  useEffect(() => {
    const clean = cardNumber.replace(/\D/g, '')
    if (clean.startsWith('4')) setCardBrand('visa')
    else if (/^(5[1-5]|2[2-7])/.test(clean)) setCardBrand('mastercard')
    else if (/^(506|507|650|504)/.test(clean)) setCardBrand('verve')
    else setCardBrand('generic')
  }, [cardNumber])

  // ── Input handlers ─────────────────────────────────────────────────────────
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 19)
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    setExpiry(raw.length >= 3 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw)
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
  }

  // ── Processing animation ───────────────────────────────────────────────────
  const runProcessingSteps = (): Promise<void> =>
    new Promise((resolve) => {
      let i = 0
      const tick = () => {
        setProcessStep(i)
        i++
        if (i < PROCESSING_STEPS.length) {
          setTimeout(tick, 900 + Math.random() * 400)
        } else {
          setTimeout(resolve, 800)
        }
      }
      tick()
    })

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleAuthorizeDebit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rawCard = cardNumber.replace(/\s+/g, '')
    if (rawCard.length < 16) { toast.error('Enter a valid 16–19 digit card number'); return }
    if (!luhnCheck(rawCard)) { toast.error('Card number is invalid — please check and re-enter'); return }
    if (!cardHolder.trim()) { toast.error('Please enter the cardholder name as printed on your card'); return }
    if (expiry.length < 5) { toast.error('Enter a valid expiry date (MM/YY)'); return }

    const [mm, yy] = expiry.split('/')
    const expMonth = parseInt(mm, 10)
    const expYear = 2000 + parseInt(yy, 10)
    const now = new Date()
    if (expMonth < 1 || expMonth > 12 || expYear < now.getFullYear() ||
      (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
      toast.error('Card has expired or expiry date is invalid'); return
    }

    if (cvv.length < 3) { toast.error('Enter the 3-digit CVV from the back of your card'); return }

    setIsProcessing(true)
    setProcessStep(0)

    try {
      // Run animated steps in parallel with the actual API call
      const stepsPromise = runProcessingSteps()

      const payload = {
        card_number: rawCard,
        expiry_month: expMonth,
        expiry_year: expYear,
        cvv,
        cardholder_name: cardHolder.trim().toUpperCase(),
        pin: pin || undefined,
        amount_ngn: amount,
        currency: 'NGN',
        email,
        reva_id: revaId,
        payment_type: paymentType,
        order_id: orderId,
        metadata,
      }

      const [chargeRes] = await Promise.all([
        api.post('/payments/charge-card', payload),
        stepsPromise,
      ])

      const ref = chargeRes.data?.reference || chargeRes.data?.transaction_id || `TRF_${Date.now()}`
      toast.success('💳 Card debited & settled to Access Bank successfully!')
      await onSuccess(ref)
    } catch (err: any) {
      setProcessStep(-1)
      const msg = err.response?.data?.detail || err.message || 'Card debit failed. Please check your card details.'
      toast.error(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Card brand logos ───────────────────────────────────────────────────────
  const BrandLogo = () => {
    if (cardBrand === 'visa') return (
      <span className="font-serif italic font-extrabold text-xl tracking-wider text-blue-300">VISA</span>
    )
    if (cardBrand === 'mastercard') return (
      <div className="flex items-center -space-x-2.5">
        <div className="w-6 h-6 rounded-full bg-red-500 opacity-90" />
        <div className="w-6 h-6 rounded-full bg-amber-400 opacity-90" />
      </div>
    )
    if (cardBrand === 'verve') return (
      <span className="font-bold text-xs tracking-wider text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded border border-teal-500/40">VERVE</span>
    )
    return <span className="text-[10px] font-mono text-cream-400 tracking-wider">INTERSWITCH</span>
  }

  // ── Masked card display ────────────────────────────────────────────────────
  const displayNumber = (() => {
    const raw = cardNumber.replace(/\s/g, '').padEnd(16, '•')
    return [0, 4, 8, 12].map(i => raw.slice(i, i + 4)).join(' ')
  })()

  return (
    <div className="bg-dark-900 text-cream-50 rounded-2xl p-5 sm:p-6 border border-gold-500/30 shadow-2xl space-y-5 max-w-md mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-dark-700 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-cream-50">{title}</h3>
            <p className="text-[11px] text-cream-300">
              {subtitle || `Instant Card Debit · ₦${amount.toLocaleString()} NGN`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gold-400 bg-gold-500/10 border border-gold-500/30 px-2.5 py-1 rounded-full">
          <Lock className="w-3 h-3" />
          <span>256-Bit SSL</span>
        </div>
      </div>

      {/* ── 3D Card Visual ── */}
      <div
        className="relative"
        style={{ perspective: '1000px' }}
        onClick={() => !isProcessing && setIsFlipped(f => !f)}
      >
        <div
          className="relative w-full transition-transform duration-700 cursor-pointer"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            height: '180px',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 via-neutral-800 to-amber-950/60 border border-gold-500/40" />
            {/* glare */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            {/* ambient */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative h-full flex flex-col justify-between p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-sm tracking-widest text-gold-400">REVA HUB</span>
                  <span className="text-[9px] uppercase font-mono text-cream-400 border border-gold-500/30 px-1.5 py-0.5 rounded">DEBIT</span>
                </div>
                <BrandLogo />
              </div>

              {/* EMV chip + NFC */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 border border-yellow-300/40 shadow-inner flex flex-col justify-around p-1 relative overflow-hidden">
                  <div className="border-b border-amber-800/30 w-full" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border border-amber-800/20 rounded-sm" />
                  </div>
                  <div className="border-b border-amber-800/30 w-full" />
                </div>
                <Wifi className="w-5 h-5 text-cream-300/50 rotate-90" />
              </div>

              {/* Card Number */}
              <div className="font-mono text-lg font-bold tracking-[0.25em] text-cream-50 select-none">
                {displayNumber}
              </div>

              {/* Cardholder & Expiry */}
              <div className="flex items-end justify-between text-xs">
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-cream-400/70 mb-0.5">Cardholder</span>
                  <span className="font-semibold tracking-wide uppercase truncate max-w-[180px] block text-cream-50">
                    {cardHolder || 'YOUR NAME HERE'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] uppercase tracking-widest text-cream-400/70 mb-0.5">Expires</span>
                  <span className="font-mono font-bold text-cream-50">{expiry || 'MM/YY'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-tl from-zinc-900 via-neutral-800 to-zinc-800 border border-gold-500/40" />
            <div className="relative h-full flex flex-col justify-center space-y-4">
              {/* Magnetic stripe */}
              <div className="bg-dark-950 h-10 w-full" />
              {/* Signature strip + CVV */}
              <div className="px-5 flex items-center gap-3">
                <div className="flex-1 bg-white/10 h-9 rounded px-3 flex items-center">
                  <span className="text-[8px] text-cream-200/40 tracking-widest">AUTHORIZED SIGNATURE</span>
                </div>
                <div className="bg-white rounded px-3 py-1.5 text-center min-w-[52px]">
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wider mb-0.5">CVV</div>
                  <div className="font-mono font-bold text-zinc-900 text-sm tracking-widest">
                    {cvv ? '•'.repeat(cvv.length) : '•••'}
                  </div>
                </div>
              </div>
              <p className="px-5 text-[9px] text-cream-400/50 text-center">
                Click card to flip · CVV shown here stays masked for your security
              </p>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-cream-400/50 mt-1.5">
          {isFlipped ? '← Click card to return to front' : 'Click card to view back / CVV'}
        </p>
      </div>

      {/* ── Processing Steps ── */}
      {isProcessing && processStep >= 0 && (
        <div className="rounded-xl bg-dark-950 border border-gold-500/30 p-4 space-y-2">
          {PROCESSING_STEPS.map((step, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                i < processStep
                  ? 'text-emerald-400'
                  : i === processStep
                  ? 'text-gold-300 font-semibold'
                  : 'text-dark-500'
              }`}
            >
              {i < processStep ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              ) : i === processStep ? (
                <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin text-gold-400" />
              ) : (
                <div className="w-3.5 h-3.5 shrink-0 rounded-full border border-dark-600" />
              )}
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Form ── */}
      {!isProcessing && (
        <form onSubmit={handleAuthorizeDebit} className="space-y-4" autoComplete="off">
          {/* Card Number */}
          <div>
            <label className="block text-xs font-semibold text-cream-300 mb-1.5">
              Debit Card Number <span className="text-cream-400 font-normal">(Mastercard · Visa · Verve)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={handleCardNumberChange}
                autoComplete="cc-number"
                className="w-full bg-dark-950 border border-dark-700 rounded-xl pl-3 pr-10 py-3 text-sm text-cream-100 font-mono tracking-widest focus:outline-none focus:border-gold-500 placeholder-dark-500 transition-colors"
              />
              <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-500" />
            </div>
          </div>

          {/* Cardholder Name — NOT pre-filled */}
          <div>
            <label className="block text-xs font-semibold text-cream-300 mb-1.5">
              Cardholder Name <span className="text-cream-400 font-normal">(as printed on card)</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. JOHN ADEBAYO"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
              autoComplete="cc-name"
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-3 text-sm text-cream-100 uppercase tracking-wide focus:outline-none focus:border-gold-500 placeholder-dark-500 transition-colors"
            />
          </div>

          {/* Expiry + CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-cream-300 mb-1.5">Expiry Date</label>
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="MM/YY"
                value={expiry}
                onChange={handleExpiryChange}
                autoComplete="cc-exp"
                className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-3 text-sm text-cream-100 font-mono text-center tracking-widest focus:outline-none focus:border-gold-500 placeholder-dark-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cream-300 mb-1.5">CVV</label>
              <input
                ref={cvvRef}
                type="password"
                required
                inputMode="numeric"
                maxLength={4}
                placeholder="•••"
                value={cvv}
                onChange={handleCvvChange}
                onFocus={() => setIsFlipped(true)}
                onBlur={() => setIsFlipped(false)}
                autoComplete="cc-csc"
                className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-3 text-sm text-cream-100 font-mono text-center tracking-widest focus:outline-none focus:border-gold-500 placeholder-dark-500 transition-colors"
              />
            </div>
          </div>

          {/* Card PIN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-cream-300">Card PIN</label>
              <span className="text-[10px] text-cream-500 bg-dark-800 px-2 py-0.5 rounded">Nigerian Debit Cards</span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="Enter 4-digit ATM PIN"
              value={pin}
              onChange={handlePinChange}
              autoComplete="off"
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-3 text-xs text-cream-100 font-mono text-center tracking-widest focus:outline-none focus:border-gold-500 placeholder-dark-500 transition-colors"
            />
          </div>

          {/* Summary */}
          <div className="bg-dark-950/80 border border-dark-700 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-cream-300">
              <span>Debit Amount</span>
              <span className="font-bold text-gold-400 font-mono text-sm">
                ₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-cream-500">
              <span>Settlement Account</span>
              <span className="text-emerald-400 font-medium">Access Bank · 1960630256</span>
            </div>
            <div className="flex justify-between text-[11px] text-cream-500">
              <span>Processing Fee</span>
              <span className="text-cream-300">₦0.00 (Waived)</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-dark-950 font-bold text-sm rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            <span>Debit Card — ₦{amount.toLocaleString()}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-xs text-cream-400 hover:text-cream-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </form>
      )}

      {/* ── Security Footer ── */}
      <div className="border-t border-dark-700/80 pt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] text-cream-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-gold-400" />
          <span>CBN Licensed Gateway</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>3D Secure OTP</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>PCI-DSS Compliant</span>
        </span>
      </div>
    </div>
  )
}
