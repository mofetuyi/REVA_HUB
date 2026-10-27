import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, ShieldCheck, ShieldAlert, Award, Crown } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingPage, EmptyState, VerifiedSellerBadge } from '../../components/ui/index'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [restrictUserId, setRestrictUserId] = useState<string | null>(null)
  const [restrictReason, setRestrictReason] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers', search],
    queryFn: async () => {
      const res = await api.get('/admin/users', { params: { search: search || undefined } })
      return res.data
    },
  })

  const restrictMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      api.post(`/compliance/admin/enforcement`, {
        target_user_id: userId,
        level: 'temporary_restriction',
        reason,
      }),
    onSuccess: () => {
      toast.success('Account restricted.')
      setRestrictUserId(null)
      setRestrictReason('')
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-900">User Management & Trust</h1>
          <p className="text-xs text-dark-500 mt-1">Audit accounts, monitor verification, and manage account restrictions.</p>
        </div>
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search phone or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-100 text-dark-700 uppercase font-semibold border-b border-cream-200">
              <tr>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Reva ID</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Premium</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {!users || users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-dark-400">
                    No users matched your query.
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-cream-50 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-dark-900">{u.name}</p>
                      <p className="text-dark-500 text-[11px] font-mono">{u.phone}</p>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-dark-600">
                      {u.reva_id || 'N/A'}
                    </td>
                    <td className="p-3.5 text-dark-600">
                      {u.lga}, Lagos
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.is_verified_seller && <VerifiedSellerBadge />}
                        {u.is_restricted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                            Restricted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      {u.is_premium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gold-100 text-gold-800">
                          <Crown className="w-3 h-3 text-gold-600" /> Premium
                        </span>
                      ) : (
                        <span className="text-dark-400 text-[11px]">Free</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {!u.is_restricted ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px]"
                          onClick={() => setRestrictUserId(u.id)}
                        >
                          Restrict
                        </Button>
                      ) : (
                        <span className="text-[11px] text-dark-400">Restricted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restrict Modal */}
      {restrictUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-cream-200 space-y-4">
            <h3 className="font-display font-bold text-lg text-dark-900">Restrict Account</h3>
            <p className="text-xs text-dark-600">
              Provide an objective rationale. Restricting temporarily halts listing creation, payouts, and premium benefits while investigating credible reports.
            </p>
            <textarea
              rows={3}
              value={restrictReason}
              onChange={(e) => setRestrictReason(e.target.value)}
              placeholder="e.g. Under investigation for multiple reports of damaged materials..."
              className="w-full text-xs border border-cream-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRestrictUserId(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={!restrictReason.trim()}
                onClick={() => restrictMutation.mutate({ userId: restrictUserId, reason: restrictReason.trim() })}
                isLoading={restrictMutation.isPending}
              >
                Apply Restriction
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
