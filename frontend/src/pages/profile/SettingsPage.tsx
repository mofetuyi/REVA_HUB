import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Crown, Shield, User as UserIcon, ExternalLink, ArrowRightLeft } from 'lucide-react'
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

  const { data: profile, isLoading } = useQuery<UserType>({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      return res.data
    },
  })

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
        lga: profile.lga || '',
        business_name: profile.business_name || '',
      })
    }
  }, [profile, setUser])

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
      <div className="bg-white p-6 rounded-2xl border border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-base text-dark-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-gold-600" />
            Active Mode
          </h2>
          <p className="text-xs text-dark-500 mt-1">
            You are currently operating in <strong className="capitalize text-dark-900">{mode}</strong> mode. Sellers can post material listings; buyers browse and make offers.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            const nextMode = mode === 'buyer' ? 'seller' : 'buyer'
            switchMode(nextMode)
            toast.success(`Switched to ${nextMode} mode`)
          }}
        >
          Switch to {mode === 'buyer' ? 'Seller' : 'Buyer'} Mode
        </Button>
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
