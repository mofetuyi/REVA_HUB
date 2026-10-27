import React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShieldCheck, ShieldAlert, Clock, ArrowRight, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { LoadingPage } from '../../components/ui/index'

export default function KYCPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      return res.data
    },
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
          <div className="pt-2">
            <Button
              onClick={() => startKycMutation.mutate()}
              isLoading={startKycMutation.isPending}
              className="w-full sm:w-auto"
            >
              <span>{status === 'in_progress' ? 'Resume Verification' : 'Start Identity Verification'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
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
