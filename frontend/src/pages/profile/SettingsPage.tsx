import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Crown, Shield, User as UserIcon, ExternalLink, ArrowRightLeft, Building2, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LAGOS_LGAS } from '../../lib/nigeriaData'
import { LoadingPage } from '../../components/ui/index'
import { Link } from 'react-router-dom'
import type { User as UserType } from '../../types'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { user, setUser, mode, switchMode } = useAuthStore()
  const [copied, setCopied] = useState(false)

  // Bank payout state
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [selectedBankCode, setSelectedBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedAccountName, setResolvedAccountName] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [isSavingBank, setIsSavingBank] = useState(false)
  const [bankInfo, setBankInfo] = useState<any>(null)

  const { data: profile, isLoading } = useQuery<UserType>({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      return res.data
    },
  })

  // Fetch Nigerian banks and existing payout account
  useEffect(() => {
    const loadBankData = async () => {
      try {
        const [banksRes, accountRes] = await Promise.all([
          api.get('/payouts/banks'),
          api.get('/payouts/my-bank-account'),
        ])
        if (banksRes.data?.banks) {
          setBanks(banksRes.data.banks)
          if (banksRes.data.banks.length > 0 && !selectedBankCode) {
            setSelectedBankCode(banksRes.data.banks[0].code)
          }
        }
        if (accountRes.data) {
          setBankInfo(accountRes.data)
          if (accountRes.data.bank_code) setSelectedBankCode(accountRes.data.bank_code)
          if (accountRes.data.account_number) setAccountNumber(accountRes.data.account_number)
          if (accountRes.data.account_name) setResolvedAccountName(accountRes.data.account_name)
        }
      } catch (err) {
        console.warn('Could not load bank data:', err)
      }
    }
    loadBankData()
  }, [])

  const handleResolveAccount = async () => {
    if (!accountNumber || accountNumber.length !== 10) {
      toast.error('Please enter a valid 10-digit NUBAN account number')
      return
    }
    setIsResolving(true)
    try {
      const res = await api.post('/payouts/resolve', {
        account_number: accountNumber,
        bank_code: selectedBankCode,
      })
      if (res.data?.account_name) {
        setResolvedAccountName(res.data.account_name)
        toast.success(`Account verified: ${res.data.account_name}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Could not verify account details with bank')
    } finally {
      setIsResolving(false)
    }
  }

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvedAccountName) {
      toast.error('Please verify your account details before saving')
      return
    }
    const matchedBank = banks.find((b) => b.code === selectedBankCode)
    setIsSavingBank(true)
    try {
      const res = await api.post('/payouts/save-bank-account', {
        bank_name: matchedBank?.name || 'Commercial Bank',
        bank_code: selectedBankCode,
        account_number: accountNumber,
        account_name: resolvedAccountName,
      })
      toast.success(res.data.message || 'Bank account saved for automated Paystack payouts!')
      setBankInfo(res.data)
      queryClient.invalidateQueries({ queryKey: ['myProfile'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save bank account')
    } finally {
      setIsSavingBank(false)
    }
  }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    lga: '',
    business_name: '',
  })

  React.useEffect(() => {
    if (profile) {
      setUser(profile)
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        lga: profile.lga || LAGOS_LGAS[0] || 'Ikeja',
        business_name: profile.business_name || '',
      })
    }
  }, [profile, setUser])

  const switchModeMutation = useMutation({
    mutationFn: (newMode: 'buyer' | 'seller') =>
      api.post('/auth/switch-mode', { mode: newMode }),
    onSuccess: (_data, newMode) => {
      switchMode(newMode)
      toast.success(`Switched to ${newMode === 'seller' ? 'Seller' : 'Buyer'} mode!`)
      queryClient.invalidateQueries({ queryKey: ['myProfile'] })
    },
    onError: (_err, newMode) => {
      switchMode(newMode)
      toast.success(`Switched to ${newMode === 'seller' ? 'Seller' : 'Buyer'} mode!`)
    },
  })

  const handleToggleMode = () => {
    const nextMode = mode === 'buyer' ? 'seller' : 'buyer'
    switchModeMutation.mutate(nextMode)
  }

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.put('/auth/me', data),
    onSuccess: (res) => {
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['myProfile'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleCopyRevaId = () => {
    if (!profile?.reva_id) return
    navigator.clipboard.writeText(profile.reva_id)
    setCopied(true)
    toast.success('Reva ID copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-dark-900">Account Settings</h1>
        <p className="text-xs text-dark-500 mt-1">Manage your Reva ID, Premium subscription, profile, and verification.</p>
      </div>

      {/* Reva ID & Premium Card */}
      <div className="bg-gradient-to-br from-dark-900 to-dark-800 text-cream-50 p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider">Your Stable Identifier</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-xl sm:text-2xl font-bold text-cream-50 tracking-wide select-all">
                {profile?.reva_id || 'Generating ID...'}
              </span>
              {profile?.reva_id && (
                <button
                  type="button"
                  onClick={handleCopyRevaId}
                  className="p-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-cream-200 hover:text-gold-400 transition-colors"
                  title="Copy Reva ID"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            <p className="text-[11px] text-cream-300 mt-1">
              Use this Reva ID in the <strong>REVA ID number</strong> field when making payments or upgrading.
            </p>
          </div>

          <div className="shrink-0 bg-dark-700/60 p-4 rounded-2xl border border-gold-500/30 text-center sm:text-right">
            <div className="flex items-center gap-1.5 justify-center sm:justify-end">
              <Crown className="w-4 h-4 text-gold-400" />
              <span className="text-xs font-bold text-cream-50">
                {profile?.is_premium ? 'Reva Hub Premium Member' : 'Free Tier'}
              </span>
            </div>
            {profile?.is_premium && profile?.premium_expires_at ? (
              <p className="text-[11px] text-gold-300 mt-1">
                Active until {new Date(profile.premium_expires_at).toLocaleDateString()}
              </p>
            ) : null}
            <div className="mt-3">
              <a
                href="https://paystack.shop/pay/reva"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-gold-500 hover:bg-gold-600 text-dark-900 font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <span>{profile?.is_premium ? 'Renew Subscription' : 'Upgrade to Premium'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Account Mode Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-base text-dark-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-gold-600" />
              Active Operating Mode
            </h2>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              mode === 'seller' ? 'bg-gold-100 text-gold-900 border border-gold-300' : 'bg-[#062E12]/10 text-[#062E12] border border-[#062E12]/20'
            }`}>
              {mode === 'seller' ? '💼 Seller Mode' : '🛒 Buyer Mode'}
            </span>
          </div>
          <p className="text-xs text-dark-500 max-w-xl">
            {mode === 'seller'
              ? 'In Seller Mode you can post recovered materials & circular products, manage listings, and receive automated Paystack payouts directly to your bank account.'
              : 'In Buyer Mode you browse materials, add multiple items to your cart, and place orders with Paystack Escrow and Lagos courier delivery.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleMode}
          disabled={switchModeMutation.isPending}
          className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
            mode === 'seller'
              ? 'bg-[#062E12] hover:bg-[#08421a] text-white'
              : 'bg-gold-500 hover:bg-gold-600 text-dark-900'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Switch to {mode === 'buyer' ? 'Seller' : 'Buyer'} Mode</span>
        </button>
      </div>

      {/* Profile Details Form */}
      <div className="bg-white p-6 rounded-2xl border border-cream-200 space-y-4">
        <h2 className="font-display font-bold text-base text-dark-900 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gold-600" />
          Profile Information
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">Phone Number</label>
              <input
                type="text"
                disabled
                value={profile?.phone || ''}
                className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-100 text-dark-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">Lagos LGA</label>
              <select
                value={formData.lga}
                onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500"
              >
                {LAGOS_LGAS.map((lga) => (
                  <option key={lga} value={lga}>{lga}</option>
                ))}
              </select>
            </div>
          </div>

          {profile?.account_type === 'business' && (
            <Input
              label="Business Name"
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            />
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={updateProfileMutation.isPending}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Seller Bank Account & Automated Paystack Payouts */}
      <div className="bg-white p-6 rounded-2xl border border-cream-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cream-200 pb-3">
          <div>
            <h2 className="font-display font-bold text-base text-dark-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#062E12]" />
              Seller Bank Account (Paystack Automated Payouts)
            </h2>
            <p className="text-xs text-dark-500 mt-1">
              94% escrow proceeds are transferred directly to this bank account the instant the buyer confirms delivery.
            </p>
          </div>
          {bankInfo?.is_configured && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Auto-Payout Active
            </span>
          )}
        </div>

        <form onSubmit={handleSaveBankAccount} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">Select Bank</label>
              <select
                value={selectedBankCode}
                onChange={(e) => {
                  setSelectedBankCode(e.target.value)
                  setResolvedAccountName('')
                }}
                className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2.5 bg-cream-50 focus:ring-2 focus:ring-gold-500"
              >
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">10-Digit NUBAN Account Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ''))
                    setResolvedAccountName('')
                  }}
                  className="flex-1 text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500 font-mono"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleResolveAccount}
                  isLoading={isResolving}
                  disabled={accountNumber.length !== 10}
                >
                  Verify
                </Button>
              </div>
            </div>
          </div>

          {resolvedAccountName && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Verified Account Name: <strong className="text-emerald-950 uppercase">{resolvedAccountName}</strong>
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                NUBAN Match
              </span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              isLoading={isSavingBank}
              disabled={!resolvedAccountName || isSavingBank}
            >
              Save Bank for Auto-Payouts
            </Button>
          </div>
        </form>
      </div>

      {/* KYC & Identity Verification */}
      <div className="bg-white p-6 rounded-2xl border border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-base text-dark-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-700" />
            Seller Identity Verification (KYC)
          </h2>
          <p className="text-xs text-dark-500 mt-1">
            Status:{' '}
            <strong className="capitalize text-dark-900">
              {profile?.kyc_status ? profile.kyc_status.replace(/_/g, ' ') : 'Not Started'}
            </strong>
            . Complete verification to qualify for the Verified Seller Badge.
          </p>
        </div>
        <Link to="/kyc">
          <Button variant="secondary" size="sm">
            {profile?.kyc_status === 'verified' ? 'View Verification' : 'Start Verification'}
          </Button>
        </Link>
      </div>

      {/* Trust & Safety Policy Link */}
      <div className="p-4 bg-cream-100 rounded-2xl border border-cream-200 text-xs text-dark-600 flex items-center justify-between">
        <div>
          <span className="font-bold text-dark-900">Reva Hub Trust, Safety & Acceptable Use:</span> Version{' '}
          <span className="font-mono">{profile?.policy_version_accepted || '1.0'}</span> accepted.
        </div>
        <Link to="/policy" className="text-gold-600 font-semibold hover:underline">
          Read Policy →
        </Link>
      </div>
    </div>
  )
}
