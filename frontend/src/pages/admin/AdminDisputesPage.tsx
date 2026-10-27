import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { LoadingPage, EmptyState, PriceDisplay, StatusBadge } from '../../components/ui/index'

export default function AdminDisputesPage() {
  const queryClient = useQueryClient()
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['adminDisputes'],
    queryFn: async () => {
      const res = await api.get('/admin/disputes')
      return res.data
    },
  })

  const resolveMutation = useMutation({
    mutationFn: ({ disputeId, resolution, notes }: { disputeId: string; resolution: 'refund' | 'release'; notes: string }) =>
      api.post(`/admin/disputes/${disputeId}/resolve`, { resolution, resolution_notes: notes }),
    onSuccess: () => {
      toast.success('Dispute resolved and escrow state updated!')
      setSelectedDispute(null)
      setResolutionNotes('')
      queryClient.invalidateQueries({ queryKey: ['adminDisputes'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-dark-900">Marketplace Dispute Resolution</h1>
        <p className="text-xs text-dark-500 mt-1">Mediate order delivery conflicts, evaluate evidence, and release or refund escrow.</p>
      </div>

      {!disputes || disputes.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="No open disputes"
          description="All marketplace orders are progressing normally without active complaints."
        />
      ) : (
        <div className="space-y-4">
          {disputes.map((d: any) => (
            <div
              key={d.id}
              className="bg-white p-5 rounded-2xl border border-cream-200 hover:border-gold-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 capitalize">
                    {d.reason.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-dark-400">Order #{d.order_number || 'N/A'}</span>
                </div>
                <StatusBadge status={d.status} />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-dark-900">Description from claimant:</p>
                <p className="text-xs text-dark-600 bg-cream-50 p-3 rounded-xl border border-cream-200">
                  {d.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-dark-500 border-t border-cream-100">
                <div>
                  Claimant: <strong className="text-dark-800">{d.raised_by_name || 'User'}</strong> · Amount: <strong className="text-dark-900">₦{Number(d.order_amount || 0).toLocaleString()}</strong>
                </div>
                {d.status === 'open' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSelectedDispute(d)}
                      className="bg-dark-900 text-gold-400 hover:bg-dark-800"
                    >
                      Resolve Dispute
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-cream-200 space-y-4">
            <h3 className="font-display font-bold text-lg text-dark-900">Resolve Dispute #{selectedDispute.order_number}</h3>
            <p className="text-xs text-dark-600">
              Decide whether to release escrow funds to the seller or refund the buyer. State clear findings in the resolution notes.
            </p>

            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">
                Resolution Notes (Required audit rationale)
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Findings based on evidence and communications with buyer and seller..."
                className="w-full text-xs border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-cream-100">
              <Button variant="ghost" onClick={() => setSelectedDispute(null)}>Cancel</Button>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  disabled={!resolutionNotes.trim()}
                  isLoading={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ disputeId: selectedDispute.id, resolution: 'refund', notes: resolutionNotes.trim() })}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refund Buyer
                </Button>
                <Button
                  disabled={!resolutionNotes.trim()}
                  isLoading={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ disputeId: selectedDispute.id, resolution: 'release', notes: resolutionNotes.trim() })}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Release to Seller
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
