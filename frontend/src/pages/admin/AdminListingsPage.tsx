import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { LoadingPage, EmptyState, PriceDisplay } from '../../components/ui/index'

export default function AdminListingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'flagged' | 'all'>('pending')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: listings, isLoading } = useQuery({
    queryKey: ['adminListings', activeTab],
    queryFn: async () => {
      const res = await api.get('/admin/listings', {
        params: {
          moderation_status: activeTab === 'pending' ? 'pending' : undefined,
          is_flagged: activeTab === 'flagged' ? true : undefined,
        },
      })
      return res.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/listings/${id}/approve`),
    onSuccess: () => {
      toast.success('Listing approved and published to the marketplace!')
      queryClient.invalidateQueries({ queryKey: ['adminListings'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/listings/${id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Listing rejected.')
      setRejectId(null)
      setRejectReason('')
      queryClient.invalidateQueries({ queryKey: ['adminListings'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-900">Listing Moderation Queue</h1>
          <p className="text-xs text-dark-500 mt-1">Review pending and flagged material listings before public broadcast.</p>
        </div>
        <div className="flex bg-cream-200 p-1 rounded-xl text-xs font-semibold">
          {(['pending', 'flagged', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                activeTab === tab ? 'bg-white text-dark-900 shadow-sm' : 'text-dark-600 hover:text-dark-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Listings List */}
      {!listings || listings.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No listings in queue"
          description={`There are currently no ${activeTab} listings requiring review.`}
        />
      ) : (
        <div className="space-y-4">
          {listings.map((item: any) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-cream-200 hover:border-gold-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1">
                {item.photos && item.photos.length > 0 ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-cream-100 border border-cream-200 shrink-0">
                    <img src={item.photos[0].url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-cream-100 flex items-center justify-center text-xl shrink-0">
                    📦
                  </div>
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cream-100 text-dark-700 capitalize">
                      {item.category}
                    </span>
                    <span className="text-xs text-dark-400">· {item.lga}, Lagos</span>
                    {item.is_flagged && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Flagged ({item.flag_count})
                      </span>
                    )}
                  </div>
                  <h2 className="font-display font-bold text-base text-dark-900">{item.title}</h2>
                  <p className="text-xs text-dark-600 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-4 text-xs pt-1">
                    <span className="font-semibold text-dark-900">
                      <PriceDisplay amount={Number(item.price_ngn)} />
                    </span>
                    <span className="text-dark-500">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="text-dark-400">Seller: {item.seller_name || 'Seller'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(item.id)}
                  isLoading={approveMutation.isPending}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setRejectId(item.id)}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-cream-200 space-y-4">
            <h3 className="font-display font-bold text-lg text-dark-900">Reject Listing</h3>
            <p className="text-xs text-dark-600">
              Provide a clear reason so the seller understands what policy rule was violated or what correction is needed.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Prohibited material (batteries), hazardous waste, or unclear quantity..."
              className="w-full text-xs border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={!rejectReason.trim()}
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason.trim() })}
                isLoading={rejectMutation.isPending}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
