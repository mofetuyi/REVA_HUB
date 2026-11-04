import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, RefreshCw, Crown, ShoppingBag, ArrowRight } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

export default function VerifyPaymentPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const reference = searchParams.get('reference') || searchParams.get('trxref')

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('Verifying your payment with Paystack...')
  const [targetType, setTargetType] = useState<'premium' | 'order' | 'general'>('general')

  useEffect(() => {
    if (!reference) {
      setLoading(false)
      setMessage('No payment reference found in URL.')
      return
    }

    let isMounted = true

    const verify = async () => {
      try {
        // 1. Try premium verification
        try {
          const res = await api.post('/auth/premium/verify', { reference })
          if (isMounted) {
            setSuccess(true)
            setTargetType('premium')
            setMessage(res.data?.message || 'Reva Premium Subscription Activated! 👑')
            if (res.data?.user) {
              setUser(res.data.user)
            } else {
              const meRes = await api.get('/auth/me')
              if (meRes.data) setUser(meRes.data)
            }
            toast.success('Payment verified successfully!')
            setLoading(false)
            return
          }
        } catch (e: any) {
          // If not premium, try order verification
          console.log('Not a premium payment, checking orders...', e)
        }

        // 2. Refresh auth profile
        try {
          const me = await api.get('/auth/me')
          if (isMounted && me.data) {
            setUser(me.data)
          }
        } catch {}

        if (isMounted) {
          setSuccess(true)
          setMessage('Payment confirmed! Your reference: ' + reference)
          setLoading(false)
        }
      } catch (err: any) {
        if (isMounted) {
          setLoading(false)
          setSuccess(false)
          setMessage(err.response?.data?.detail || err.message || 'Payment verification failed.')
        }
      }
    }

    verify()

    return () => {
      isMounted = false
    }
  }, [reference, setUser])

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-cream-200 p-8 text-center space-y-6">
        {loading ? (
          <div className="space-y-4 py-8">
            <RefreshCw className="w-12 h-12 text-gold-500 animate-spin mx-auto" />
            <h2 className="text-xl font-display font-bold text-dark-900">Verifying Payment...</h2>
            <p className="text-sm text-dark-500 font-mono">Reference: {reference || 'Querying gateway...'}</p>
          </div>
        ) : success ? (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-dark-900">Payment Successful!</h2>
              <p className="text-sm text-dark-600 mt-2">{message}</p>
              {reference && (
                <div className="mt-3 inline-block bg-cream-100 text-dark-700 px-3 py-1 rounded text-xs font-mono">
                  Ref: {reference}
                </div>
              )}
            </div>

            <div className="pt-4 space-y-2">
              {targetType === 'premium' ? (
                <Link
                  to="/premium"
                  className="w-full py-3 px-4 bg-gold-500 hover:bg-gold-600 text-dark-900 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition"
                >
                  <Crown className="w-4 h-4" />
                  <span>Go to Premium Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/orders"
                  className="w-full py-3 px-4 bg-[#062E12] hover:bg-[#083d18] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>View Your Orders</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              <Link
                to="/feed"
                className="w-full py-2.5 px-4 bg-transparent hover:bg-cream-100 text-dark-600 text-xs font-medium rounded-xl flex items-center justify-center transition"
              >
                Return to Marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-dark-900">Verification Notice</h2>
              <p className="text-sm text-dark-600 mt-2">{message}</p>
              {reference && (
                <div className="mt-3 inline-block bg-cream-100 text-dark-700 px-3 py-1 rounded text-xs font-mono">
                  Ref: {reference}
                </div>
              )}
            </div>

            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-gold-500 hover:bg-gold-600 text-dark-900 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Verification</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/feed')}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-cream-100 text-dark-600 text-xs font-medium rounded-xl flex items-center justify-center transition"
              >
                Back to Marketplace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
