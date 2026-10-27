import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag, CheckCircle2, XCircle, ShieldAlert, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { LoadingPage, EmptyState, StatusBadge } from '../../components/ui/index'
import type { Report } from '../../types'

export default function AdminReportsPage() {
  const queryClient = useQueryClient()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const { data: reports, isLoading } = useQuery({
    queryKey: ['adminReports'],
    queryFn: async () => {
      const res = await api.get('/compliance/admin/reports')
      return res.data
    },
  })

  const resolveMutation = useMutation({
    mutationFn: ({ reportId, resolution, notes }: { reportId: string; resolution: 'resolved' | 'dismissed'; notes: string }) =>
      api.post(`/compliance/admin/reports/${reportId}/resolve`, { resolution, notes }),
    onSuccess: () => {
      toast.success('Report resolved and audit log recorded!')
      setSelectedReport(null)
      setResolutionNotes('')
      queryClient.invalidateQueries({ queryKey: ['adminReports'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-dark-900 flex items-center gap-2">
          <Flag className="w-6 h-6 text-red-600" />
          Trust & Safety Reports Queue
        </h1>
        <p className="text-xs text-dark-500 mt-1">
          Review community reports regarding prohibited materials, fraudulent accounts, payment violations, and harassment.
        </p>
      </div>

      {!reports || reports.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="No open reports"
          description="There are currently no community reports awaiting moderation."
        />
      ) : (
        <div className="space-y-4">
          {reports.map((r: Report) => (
            <div
              key={r.id}
              className="bg-white p-5 rounded-2xl border border-cream-200 hover:border-gold-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 capitalize">
                    {r.reason.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-dark-500 capitalize">
                    Target: {r.target_type} ({r.target_id.slice(0, 8)}...)
                  </span>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-dark-900">Reporter's Statement:</p>
                <p className="text-xs text-dark-700 bg-cream-50 p-3 rounded-xl border border-cream-200">
                  {r.description}
                </p>
              </div>

              {Array.isArray(r.evidence_urls) && r.evidence_urls.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-dark-700">Evidence URLs:</span>
                  <ul className="list-disc list-inside text-gold-600 font-mono text-[11px] truncate">
                    {r.evidence_urls.map((u, i) => (
                      <li key={i}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-cream-100 text-xs">
                <span className="text-dark-400">Submitted: {new Date(r.created_at).toLocaleDateString()}</span>
                {r.status === 'open' && (
                  <Button size="sm" onClick={() => setSelectedReport(r)}>
                    Take Action
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-cream-200 space-y-4">
            <h3 className="font-display font-bold text-lg text-dark-900">
              Resolve Report ({selectedReport.reason.replace(/_/g, ' ')})
            </h3>
            <p className="text-xs text-dark-600">
              Specify the moderation decision and resolution notes. All resolutions are recorded in the immutable moderation audit log.
            </p>

            <div>
              <label className="block text-xs font-semibold text-dark-800 mb-1">
                Resolution Findings / Action Taken *
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Content verified as violating acceptable use; listing delisted and seller warned..."
                className="w-full text-xs border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-cream-100">
              <Button variant="ghost" onClick={() => setSelectedReport(null)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={!resolutionNotes.trim()}
                  onClick={() =>
                    resolveMutation.mutate({
                      reportId: selectedReport.id,
                      resolution: 'dismissed',
                      notes: resolutionNotes.trim(),
                    })
                  }
                  isLoading={resolveMutation.isPending}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Dismiss Report
                </Button>
                <Button
                  disabled={!resolutionNotes.trim()}
                  onClick={() =>
                    resolveMutation.mutate({
                      reportId: selectedReport.id,
                      resolution: 'resolved',
                      notes: resolutionNotes.trim(),
                    })
                  }
                  isLoading={resolveMutation.isPending}
                  className="bg-green-700 hover:bg-green-800 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
