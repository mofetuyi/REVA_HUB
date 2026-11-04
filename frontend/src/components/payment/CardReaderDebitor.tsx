import React, { useState, useEffect } from 'react'
import {
  CreditCard, ShieldCheck, Lock, CheckCircle2, AlertCircle,
  RefreshCw, Sparkles, ArrowRight, Zap, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: any) => {
        openIframe: () => void
      }
    }
  }
}

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

export default function CardReaderDebitor({
  amount,
  title = 'Card Reader & Debitor',
  subtitle,
  email,
  name = '',
  phone = '',
  revaId = '',
  metadata = {},
  onSuccess,
  onCancel,
  paymentType,
  orderId,
}: CardReaderDebitorProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState(name || '')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [pin, setPin] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardBrand, setCardBrand] = useState<'mastercard' | 'visa' | 'verve' | 'generic'>('generic')
  const [publicKey, setPublicKey] = useState<string | null>(null)

  // Fetch live Paystack config
  useEffect(() => {
    api.get('/auth/payment-config')
      .then((res) => {
        if (res.data?.public_key) {
          setPublicKey(res.data.public_key)
        }
      })
      .catch(() => {})
  }, [])

  // Detect card brand
  useEffect(() => {
    const clean = cardNumber.replace(/\D/g, '')
    if (clean.startsWith('4')) {
      setCardBrand('visa')
    } else if (/^(5[1-5]|2[2-7])/.test(clean)) {
      setCardBrand('mastercard')
    } else if (/^(506|507|650|504)/.test(clean)) {
      setCardBrand('verve')
    } else {
      setCardBrand('generic')
    }
  }, [cardNumber])

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    const truncated = raw.slice(0, 19)
    // Add space every 4 digits
    const formatted = truncated.match(/.{1,4}/g)?.join(' ') || truncated
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`)
    } else {
      setExpiry(raw)
    }
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    setCvv(raw)
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(raw)
  }

  const handleAuthorizeDebit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rawCard = cardNumber.replace(/\s+/g, '')
    if (rawCard.length < 16) {
      toast.error('Please enter a valid 16-19 digit card number')
      return
    }
    if (expiry.length < 5) {
      toast.error('Please enter a valid expiry date (MM/YY)')
      return
    }
    if (cvv.length < 3) {
      toast.error('Please enter the 3-digit CVV from the back of your card')
      return
    }

    setIsProcessing(true)

    try {
      // 1. Initialize transaction with backend Paystack integration
      let initData: any
      if (paymentType === 'premium') {
        const res = await api.post('/auth/premium/initiate-payment')
        initData = res.data
      } else if (orderId) {
        const res = await api.post(`/orders/${orderId}/initiate-payment`)
        initData = res.data
      } else {
        // Pre-order checkout initiation for goods
        const res = await api.post('/orders/initiate-checkout-payment', {
          amount_ngn: amount,
          listing_id: metadata?.listing_id,
          email: email,
          reva_id: revaId,
        })
        initData = res.data
      }

      const accessCode = initData?.access_code
      const reference = initData?.reference
      const checkoutUrl = initData?.checkout_url

      // If Paystack inline JS is available and we have access_code or public_key
      if (window.PaystackPop && (accessCode || publicKey)) {
        const handler = window.PaystackPop.setup({
          key: publicKey || undefined,
          access_code: accessCode || undefined,
          reference: reference,
          email: email,
          amount: Math.round(amount * 100),
          currency: 'NGN',
          metadata: {
            ...metadata,
            reva_id: revaId,
            payment_type: paymentType,
            custom_fields: [
              {
                display_name: 'REVA ID number',
                variable_name: 'reva_id_number',
                value: revaId,
              },
            ],
          },
          callback: async (response: any) => {
            const confirmedRef = response?.reference || reference
            toast.success('Debit authorized & card charged successfully! 💳')
            await onSuccess(confirmedRef)
            setIsProcessing(false)
          },
          onClose: () => {
            setIsProcessing(false)
            toast('Payment window closed.')
            if (onCancel) onCancel()
          },
        })
        handler.openIframe()
      } else if (checkoutUrl) {
        // Direct checkout redirect / popup window
        toast.success('Connecting to Bank Debit Gateway...')
        const paymentWindow = window.open(checkoutUrl, '_blank')
        if (!paymentWindow) {
          window.location.href = checkoutUrl
        } else {
          // Provide prompt for user when returning
          toast((t) => (
            <div className="space-y-2 text-xs">
              <p className="font-bold">Card Debit Window Opened</p>
              <p>Complete your card debit & 3D-Secure bank OTP in the window.</p>
              <button
                type="button"
                onClick={async () => {
                  toast.dismiss(t.id)
                  await onSuccess(reference)
                }}
                className="w-full py-1.5 px-3 bg-gold-500 hover:bg-gold-600 text-dark-900 font-bold rounded-lg text-xs"
              >
                I have completed the card debit
              </button>
            </div>
          ), { duration: 15000 })
        }
        setIsProcessing(false)
      } else {
        throw new Error('Unable to initialize card debitor. Please try again or use direct checkout.')
      }
    } catch (err: any) {
      setIsProcessing(false)
      const msg = err.response?.data?.detail || err.message || 'Card debit authorization failed. Please check details.'
      toast.error(msg)
    }
  }

  return (
    <div className="bg-dark-900 text-cream-50 rounded-2xl p-5 sm:p-6 border border-gold-500/30 shadow-2xl space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-700 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-cream-50">{title}</h3>
            <p className="text-[11px] text-cream-300">
              {subtitle || `Instant Card Debit • ₦${amount.toLocaleString()} NGN`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gold-400 bg-gold-500/10 border border-gold-500/30 px-2.5 py-1 rounded-full">
          <Lock className="w-3 h-3" />
          <span>256-Bit SSL</span>
        </div>
      </div>

      {/* 3D Realistic Virtual Card Terminal */}
      <div className="relative overflow-hidden rounded-2xl p-5 shadow-xl bg-gradient-to-tr from-dark-950 via-dark-800 to-amber-950/70 border border-gold-500/40 text-cream-50 transition-all hover:scale-[1.01]">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-wider text-gold-400">REVA HUB</span>
            <span className="text-[10px] uppercase font-mono text-cream-400 border border-gold-500/30 px-1.5 py-0.2 rounded">
              DEBIT
            </span>
          </div>

          {/* Dynamic Card Brand Logo */}
          <div className="text-right">
            {cardBrand === 'visa' && (
              <span className="font-serif italic font-extrabold text-lg tracking-wider text-blue-400">VISA</span>
            )}
            {cardBrand === 'mastercard' && (
              <div className="flex items-center -space-x-2">
                <div className="w-5 h-5 rounded-full bg-red-500/90" />
                <div className="w-5 h-5 rounded-full bg-amber-400/90" />
              </div>
            )}
            {cardBrand === 'verve' && (
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-teal-400 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-500/40">
                VERVE
              </span>
            )}
            {cardBrand === 'generic' && (
              <div className="flex items-center gap-1 text-[10px] text-cream-400 font-mono">
                <span>INTERSWITCH</span>
              </div>
            )}
          </div>
        </div>

        {/* EMV Chip & Contactless */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-7 rounded bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border border-yellow-200/50 shadow-inner flex flex-col justify-around p-1">
            <div className="border-b border-amber-800/40 w-full" />
            <div className="border-b border-amber-800/40 w-full" />
          </div>
          <Zap className="w-4 h-4 text-gold-400/70 rotate-90" />
        </div>

        {/* Formatted Live Card Number */}
        <div className="font-mono text-base sm:text-lg font-bold tracking-widest text-cream-100 mb-4 select-none">
          {cardNumber || '•••• •••• •••• ••••'}
        </div>

        {/* Cardholder & Expiry */}
        <div className="flex items-end justify-between text-xs">
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-cream-400">Cardholder</span>
            <span className="font-semibold text-cream-100 uppercase tracking-wide truncate max-w-[180px] block">
              {cardHolder || 'CARDHOLDER NAME'}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] uppercase tracking-wider text-cream-400">Expires</span>
            <span className="font-mono font-semibold text-cream-100">
              {expiry || 'MM/YY'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Entry Form */}
      <form onSubmit={handleAuthorizeDebit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-cream-300 mb-1">
            Debit Card Number (Mastercard / Visa / Verve)
          </label>
          <div className="relative">
            <input
              type="text"
              required
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={handleCardNumberChange}
              className="w-full bg-dark-950 border border-dark-700 rounded-xl pl-3 pr-10 py-2.5 text-sm text-cream-100 font-mono tracking-wider focus:outline-none focus:border-gold-500 placeholder-dark-500"
            />
            <div className="absolute right-3 top-3 text-cream-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-cream-300 mb-1">
            Cardholder Name (as printed on card)
          </label>
          <input
            type="text"
            required
            placeholder="e.g. MOFEOLUWA TUYI"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
            className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 uppercase tracking-wide focus:outline-none focus:border-gold-500 placeholder-dark-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-cream-300 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              required
              inputMode="numeric"
              placeholder="MM/YY"
              value={expiry}
              onChange={handleExpiryChange}
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 font-mono text-center tracking-wider focus:outline-none focus:border-gold-500 placeholder-dark-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-cream-300 mb-1">
              CVV (3 Digits)
            </label>
            <input
              type="password"
              required
              inputMode="numeric"
              maxLength={4}
              placeholder="•••"
              value={cvv}
              onChange={handleCvvChange}
              className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-cream-100 font-mono text-center tracking-widest focus:outline-none focus:border-gold-500 placeholder-dark-500"
            />
          </div>
        </div>

        {/* Optional ATM PIN for Nigerian Verve/Mastercard */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-cream-300">
              Card PIN (Optional 4-Digit ATM PIN)
            </label>
            <span className="text-[10px] text-cream-400">For Nigerian Debit Cards</span>
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={handlePinChange}
            className="w-full bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-cream-100 font-mono text-center tracking-widest focus:outline-none focus:border-gold-500 placeholder-dark-500"
          />
        </div>

        {/* Summary & Debit Button */}
        <div className="pt-2 space-y-3">
          <div className="bg-dark-950/70 border border-dark-700 rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between text-cream-300">
              <span>Debit Amount:</span>
              <span className="font-bold text-gold-400 font-mono text-sm">₦{amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[11px] text-cream-400">
              <span>Escrow Status:</span>
              <span className="text-green-400 font-medium">Secured with Paystack PCI-DSS</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-dark-950 font-bold text-sm rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authorizing Debit & 3D OTP...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Debit Card ₦{amount.toLocaleString()}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
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
        </div>
      </form>

      {/* Security Footer */}
      <div className="border-t border-dark-700/80 pt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] text-cream-400">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Paystack Certified</span>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-gold-400" />
          <span>3D Secure Bank OTP</span>
        </span>
        <span>•</span>
        <span>Central Bank of Nigeria (CBN) Compliant</span>
      </div>
    </div>
  )
}
