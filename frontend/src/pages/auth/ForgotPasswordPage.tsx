import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Lock, ArrowLeft, MessageSquare, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  // Step 1: Request OTP | Step 2: Enter OTP & New Password
  const [step, setStep] = useState<1 | 2>(1)
  const [phone, setPhone] = useState('')
  const [cleanPhone, setCleanPhone] = useState('')
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  // Step 2 form state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(30)
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (step === 2) {
      otpInputRefs.current[0]?.focus()
    }
  }, [step])

  useEffect(() => {
    if (step === 2 && resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [step, resendCooldown])

  // Request WhatsApp Reset Code
  const sendOtpMutation = useMutation({
    mutationFn: (targetPhone: string) =>
      api.post('/auth/reset-password/send-otp', { phone: targetPhone }),
    onSuccess: (res) => {
      setCleanPhone(res.data.phone || phone)
      if (res.data.whatsapp_link) {
        setWhatsappLink(res.data.whatsapp_link)
      }
      if (res.data.user_name) {
        setUserName(res.data.user_name)
      }
      setStep(2)
      setResendCooldown(30)
      toast.success(res.data.message || 'WhatsApp verification code sent!')
    },
    onError: (err) => {
      toast.error(extractError(err))
    },
  })

  // Submit OTP + New Password
  const confirmResetMutation = useMutation({
    mutationFn: (data: { phone: string; otp: string; new_password: string }) =>
      api.post('/auth/reset-password/confirm', data),
    onSuccess: (res) => {
      // Store session and login immediately
      login(
        { access_token: res.data.access_token, refresh_token: res.data.refresh_token },
        res.data.user
      )
      toast.success(res.data.message || 'Password reset successfully! Welcome back.')
      navigate('/', { replace: true })
    },
    onError: (err) => {
      toast.error(extractError(err))
    },
  })

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    const raw = phone.trim().replace(/\D/g, '')
    if (!raw || raw.length < 10) {
      toast.error('Please enter a valid 10 or 11-digit Nigerian phone number')
      return
    }
    const formatted = raw.startsWith('234')
      ? raw
      : raw.startsWith('0')
      ? '234' + raw.slice(1)
      : '234' + raw
    sendOtpMutation.mutate(formatted)
  }

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) {
      otpInputRefs.current[idx + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpInputRefs.current[idx - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
    }
  }

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit WhatsApp code')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    confirmResetMutation.mutate({
      phone: cleanPhone || phone,
      otp: code,
      new_password: newPassword,
    })
  }

  return (
    <div className="animate-fade-in max-w-md mx-auto">
      {step === 1 ? (
        <div>
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-200">
              <MessageSquare className="w-7 h-7 text-emerald-700" />
            </div>
            <h1 className="text-2xl font-display font-bold text-dark-900">Reset Password</h1>
            <p className="text-dark-600 mt-1 text-sm">
              Verify your registered phone number via WhatsApp to set a new password.
            </p>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-800 mb-1">
                Your Registered Phone Number
              </label>
              <div className="flex">
                <span className="flex items-center px-3 bg-cream-100 border border-r-0 border-cream-200 rounded-l-lg text-dark-700 text-sm font-semibold">
                  +234
                </span>
                <input
                  type="tel"
                  placeholder="8012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={11}
                  required
                  className="flex-1 px-3 py-2 border border-cream-200 bg-white text-dark-900 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <p className="text-xs text-dark-500 mt-1.5">
                We will send a 6-digit verification code directly to your WhatsApp.
              </p>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={sendOtpMutation.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send WhatsApp Reset Code</span>
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-dark-600 hover:text-dark-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-200">
              <KeyRound className="w-7 h-7 text-emerald-700" />
            </div>
            <h1 className="text-2xl font-display font-bold text-dark-900">
              {userName ? `Hi ${userName}, Set New Password` : 'Enter WhatsApp Code'}
            </h1>
            <p className="text-dark-600 mt-1 text-sm">
              We sent a 6-digit code to WhatsApp number <strong>+{cleanPhone}</strong>
            </p>
          </div>

          <form onSubmit={handleConfirmReset} className="space-y-5">
            {/* 6-digit OTP Inputs */}
            <div>
              <label className="block text-xs font-semibold text-dark-700 mb-2 text-center uppercase tracking-wider">
                6-Digit WhatsApp Code
              </label>
              <div className="flex justify-center gap-2 mb-2" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el
                    }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1}`}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 transition-colors bg-white shadow-sm"
                    style={{ borderColor: digit ? '#059669' : '#D1D5DB' }}
                  />
                ))}
              </div>

              {whatsappLink && (
                <div className="text-center mt-2">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    <span>Didn't get message? Click to open WhatsApp</span>
                    <span>↗</span>
                  </a>
                </div>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-dark-800 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full px-3 py-2 pr-10 border border-cream-200 bg-white text-dark-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-dark-800 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-type your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                className="w-full px-3 py-2 border border-cream-200 bg-white text-dark-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              loading={confirmResetMutation.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 shadow-md"
            >
              Save New Password & Sign In
            </Button>
          </form>

          {/* Resend OTP */}
          <div className="mt-4 text-center">
            {resendCooldown > 0 ? (
              <p className="text-xs text-dark-500">
                Resend code on WhatsApp in <span className="font-bold">{resendCooldown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => sendOtpMutation.mutate(cleanPhone)}
                disabled={sendOtpMutation.isPending}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                Resend Code to WhatsApp
              </button>
            )}
          </div>

          <div className="mt-6 text-center border-t border-cream-200 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-xs text-dark-600 hover:text-dark-900 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change phone number</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
