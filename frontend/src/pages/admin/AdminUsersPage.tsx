import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, ShieldCheck, ShieldAlert, Award, Crown, Copy, Check } from 'lucide-react'
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
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers', search],
    queryFn: async () => {
      const res = await api.get('/admin/users', { params: { search: search || undefined } })
      return res.data
    },
  })

  const toggleAdminMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      api.put(`/admin/users/${userId}`, { is_admin: isAdmin }),
    onSuccess: (res, variables) => {
      toast.success(variables.isAdmin ? 'User promoted to Administrator! 🛡️' : 'Admin privileges removed.')
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    },
    onError: (err) => toast.error(extractError(err)),
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

  const copyRevaId = (revaId: string) => {
    navigator.clipboard.writeText(revaId)
    setCopiedId(revaId)
    toast.success(`Copied ${revaId} to clipboard!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-900">User Management & Trust</h1>
          <p className="text-xs text-dark-500 mt-1">Audit accounts, manage administrator privileges, and look up user REVA IDs.</p>
        </div>
        <div className="w-full sm:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-dark-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search name, phone, email, or REVA ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-cream-300 rounded-xl bg-white text-dark-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-100 text-dark-700 uppercase font-semibold border-b border-cream-200">
              <tr>
                <th className="p-3.5">User Details</th>
                <th className="p-3.5">REVA ID</th>
                <th className="p-3.5">Role / Admin</th>
                <th className="p-3.5">Account Status</th>
                <th className="p-3.5">Tier</th>
                <th className="p-3.5 text-right">Actions & Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {!users || users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-dark-400">
                    No users found matching "{search}".
                  </td>
                </tr>
              ) : (
                users.map((u: any) => {
                  const isPrimaryRoot = u.phone?.includes('7076630396')
                  return (
                    <tr key={u.id} className="hover:bg-cream-50 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-dark-900 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.is_admin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-dark-500 text-[11px] font-mono">{u.phone}</p>
                        {u.email && <p className="text-dark-400 text-[10px] truncate max-w-xs">{u.email}</p>}
                      </td>
                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1.5 bg-cream-100/80 px-2.5 py-1 rounded-lg border border-cream-200">
                          <span className="font-mono text-xs font-bold text-dark-800">
                            {u.reva_id || 'N/A'}
                          </span>
                          {u.reva_id && (
                            <button
                              type="button"
                              onClick={() => copyRevaId(u.reva_id)}
                              className="text-dark-400 hover:text-dark-900 transition-colors p-0.5"
                              title="Copy REVA ID"
                            >
                              {copiedId === u.reva_id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {u.is_admin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                            Administrator
                          </span>
                        ) : (
                          <span className="text-dark-500 text-[11px]">Member</span>
                        )}
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
                        <div className="flex items-center justify-end gap-2">
                          {/* Choose who to make Admin button */}
                          {!isPrimaryRoot && (
                            <Button
                              size="sm"
                              variant={u.is_admin ? 'secondary' : 'gold'}
                              className={`text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                                u.is_admin
                                  ? 'border-purple-300 text-purple-800 hover:bg-purple-50'
                                  : 'text-dark-900'
                              }`}
                              onClick={() => toggleAdminMutation.mutate({ userId: u.id, isAdmin: !u.is_admin })}
                              isLoading={toggleAdminMutation.isPending && toggleAdminMutation.variables?.userId === u.id}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{u.is_admin ? 'Remove Admin' : 'Make Admin'}</span>
                            </Button>
                          )}

                          {/* Restrict action */}
                          {!u.is_restricted ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] cursor-pointer"
                              onClick={() => setRestrictUserId(u.id)}
                            >
                              Restrict
                            </Button>
                          ) : (
                            <span className="text-[11px] text-dark-400">Restricted</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
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
