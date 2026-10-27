import React from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'

export default function VerifyOTPPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const phone = (location.state as { phone?: string })?.phone || ''
  const [otp, setOtp] = React.useState(['', '', '', '', '', ''])
  const [resendCooldown, setResendCooldown] = React.useState(60)
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([])

  React.useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  React.useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const verifyMutation = useMutation({
    mutationFn: (code: string) => api.post('/auth/verify-otp', { phone, otp: code }),
    onSuccess: async (res) => {
      // Fetch user profile
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      })
      login({ access_token: res.data.access_token, refresh_token: res.data.refresh_token }, meRes.data)
      toast.success('Phone verified! Welcome to Reva 🌿')
      navigate('/')
    },
    onError: (err) => {
      toast.error(extractError(err))
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    },
  })

  const resendMutation = useMutation({
    mutationFn: () => api.post('/auth/resend-otp', { phone }),
    onSuccess: () => {
      toast.success('New OTP sent')
      setResendCooldown(60)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (next.every((d) => d !== '')) {
      verifyMutation.mutate(next.join(''))
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      verifyMutation.mutate(text)
    }
  }

  if (!phone) {
    return (
      <div className="text-center space-y-4">
        <p className="text-dark-600">No phone number found. Please sign up again.</p>
        <Link to="/signup" className="text-gold-600 font-medium hover:underline">Sign up</Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">📱</div>
        <h1 className="text-2xl font-display font-bold text-dark-900">Verify your phone</h1>
        <p className="text-dark-600 mt-2 text-sm">
          Enter the 6-digit code sent to <strong>{phone}</strong>
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            aria-label={`OTP digit ${idx + 1}`}
            className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-500 transition-colors bg-white"
            style={{ borderColor: digit ? '#C9A227' : '#E8E0CC' }}
          />
        ))}
      </div>

      {verifyMutation.isPending && (
        <div className="flex justify-center mb-4">
          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="text-center">
        {resendCooldown > 0 ? (
          <p className="text-sm text-dark-500">Resend code in {resendCooldown}s</p>
        ) : (
          <button
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="text-sm text-gold-600 font-medium hover:underline disabled:opacity-50"
          >
            Resend OTP
          </button>
        )}
      </div>

      <div className="mt-6 text-center">
        <Link to="/signup" className="text-sm text-dark-500 hover:text-dark-700">← Back to sign up</Link>
      </div>
    </div>
  )
}
