import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldAlert, Clock, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { LoadingPage } from '../../components/ui/index'

export default function KYCPage() {
  const queryClient = useQueryClient()
  const [waCode, setWaCode] = React.useState('')
  const [waSent, setWaSent] = React.useState(false)
  const [waLink, setWaLink] = React.useState<string | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      return res.data
    },
  })

  const sendWaMutation = useMutation({
    mutationFn: () => api.post('/auth/whatsapp/send-otp', { phone: profile?.phone }),
    onSuccess: (res) => {
      setWaSent(true)
      if (res.data?.whatsapp_link) setWaLink(res.data.whatsapp_link)
      toast.success('💬 WhatsApp verification code sent to your phone!')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const verifyWaMutation = useMutation({
    mutationFn: () => api.post('/auth/whatsapp/verify-otp', { phone: profile?.phone, otp: waCode }),
    onSuccess: (res) => {
      toast.success('🎉 WhatsApp identity verified successfully!')
      queryClient.invalidateQueries({ queryKey: ['myProfile'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const startKycMutation = useMutation({
    mutationFn: () => api.post('/auth/kyc/start'),
    onSuccess: (res) => {
      if (res.data?.verification_url) {
        window.open(res.data.verification_url, '_blank')
        toast.success('Redirecting to secure verification provider...')
      } else {
        toast.success('KYC verification initiated. Check your phone for verification prompts.')
      }
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  const status = profile?.kyc_status || 'not_started'

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-dark-900">Seller Identity Verification</h1>
        <p className="text-xs text-dark-500 mt-1">
          Identity verification builds marketplace trust and is required to unlock the Verified Seller badge.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-cream-200 space-y-4">
        {status === 'verified' && (
          <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-sm text-green-900">Identity Verified</h2>
              <p className="text-xs text-green-800 mt-0.5">
                {profile?.google_id
                  ? 'Your identity has been authenticated and verified via Google Identity Services.'
                  : 'Your government identity credentials have been successfully authenticated by our KYC partner.'}
              </p>
            </div>
          </div>
        )}

        {status === 'in_progress' && (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-sm text-amber-900">Verification In Progress</h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Our verification partner is currently processing your submission. You will receive an update shortly.
              </p>
            </div>
          </div>
        )}

        {status === 'not_started' && (
          <div className="p-4 bg-cream-50 rounded-xl border border-cream-200 flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-gold-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-sm text-dark-900">Verification Required for Verified Seller Badge</h2>
              <p className="text-xs text-dark-600 mt-0.5">
                Verification checks your Nigerian identity documents (e.g. NIN or Driver's License) via our secure accredited partner. Reva Hub does not store raw identity photos.
              </p>
            </div>
          </div>
        )}

        {status !== 'verified' && (
          <div className="space-y-4 pt-2">
            {/* WhatsApp Phone & Identity Verification */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <h3 className="font-bold text-sm text-emerald-950">WhatsApp Phone & Identity Verification</h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Fast-track your seller trust badge by verifying your phone line directly via WhatsApp OTP.
                  </p>
                </div>
              </div>

              {!waSent ? (
                <div className="pt-1">
                  <Button
                    type="button"
                    onClick={() => sendWaMutation.mutate()}
                    isLoading={sendWaMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <span>💬 Send Code to my WhatsApp ({profile?.phone || 'Your Phone'})</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <input
                      type="text"
                      maxLength={6}
                      value={waCode}
                      onChange={(e) => setWaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit WhatsApp code"
                      className="px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <Button
                      type="button"
                      onClick={() => verifyWaMutation.mutate()}
                      isLoading={verifyWaMutation.isPending}
                      disabled={waCode.length < 6}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Verify Code
                    </Button>
                  </div>
                  {waLink && (
                    <div className="pt-1">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        Didn't receive code? Click here to open WhatsApp directly ↗
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-cream-200 flex-1" />
              <span className="text-[11px] text-dark-400 uppercase font-semibold">Or use Document KYC</span>
              <div className="h-px bg-cream-200 flex-1" />
            </div>

            <div>
              <Button
                variant="secondary"
                onClick={() => startKycMutation.mutate()}
                isLoading={startKycMutation.isPending}
                className="w-full sm:w-auto text-xs"
              >
                <span>{status === 'in_progress' ? 'Resume Document Verification' : 'Government ID Document Verification'}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Verified Seller Badge Criteria */}
      <div className="bg-white p-6 rounded-2xl border border-cream-200 space-y-3">
        <h2 className="font-display font-bold text-sm text-dark-900">Verified Seller Badge Criteria</h2>
        <ul className="text-xs text-dark-600 space-y-1.5 list-disc list-inside">
          <li>Complete external KYC identity verification.</li>
          <li>At least 5 successfully completed orders.</li>
          <li>Average buyer review rating of 4.0 or greater.</li>
          <li>No unresolved disputes in the past 30 days.</li>
        </ul>
      </div>
    </div>
  )
}
