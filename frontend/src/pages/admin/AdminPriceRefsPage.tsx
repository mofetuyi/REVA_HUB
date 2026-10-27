import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, AlertTriangle, Plus, ExternalLink, ShieldCheck, Database } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingPage, EmptyState } from '../../components/ui/index'
import { MATERIAL_CATEGORIES, UNITS } from '../../lib/nigeriaData'
import type { PriceReference } from '../../types'

export default function AdminPriceRefsPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    category: 'plastic',
    material: '',
    unit: 'kg',
    min_ngn: '',
    max_ngn: '',
    sources: '',
    notes: '',
  })

  const { data: priceRefs, isLoading } = useQuery({
    queryKey: ['priceRefs'],
    queryFn: async () => {
      const res = await api.get('/price-refs/')
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/price-refs/', data),
    onSuccess: () => {
      toast.success('Price reference added (starts as proposed)!')
      setShowCreateModal(false)
      setFormData({
        category: 'plastic',
        material: '',
        unit: 'kg',
        min_ngn: '',
        max_ngn: '',
        sources: '',
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['priceRefs'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/price-refs/${id}/approve`),
    onSuccess: () => {
      toast.success('Price range approved for AI listing review!')
      queryClient.invalidateQueries({ queryKey: ['priceRefs'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/price-refs/${id}/reject`),
    onSuccess: () => {
      toast.success('Price range marked as rejected/stale.')
      queryClient.invalidateQueries({ queryKey: ['priceRefs'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.material || !formData.min_ngn || !formData.max_ngn) {
      toast.error('Please fill all required price fields.')
      return
    }

    const sourcesList = formData.sources
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(url => ({ url, date: new Date().toISOString() }))

    createMutation.mutate({
      category: formData.category,
      material: formData.material.trim(),
      unit: formData.unit,
      min_ngn: parseFloat(formData.min_ngn),
      max_ngn: parseFloat(formData.max_ngn),
      sources: sourcesList,
      notes: formData.notes.trim(),
      status: 'proposed',
    })
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-gold-600" />
            Marketplace Price Reference Ranges
          </h1>
          <p className="text-xs text-dark-500 mt-1">
            Verified Nigerian market price benchmarks. Automated AI listing reviews evaluate seller prices strictly against approved ranges.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Reference Range
        </Button>
      </div>

      {/* Critical Admin Guidance Banner */}
      <div className="bg-amber-50 border-l-4 border-gold-500 p-4 rounded-r-2xl space-y-2 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <AlertTriangle className="w-4 h-4 text-gold-600" />
          Strict Policy: No Invented Benchmark Prices
        </div>
        <p>
          Reference ranges start empty or marked proposed. Only approve ranges derived from real Nigerian trade sources, recycler price lists, or confirmed completed sales. Unverified or stale ranges must not be approved.
        </p>
      </div>

      {/* Table */}
      {!priceRefs || priceRefs.length === 0 ? (
        <EmptyState
          icon="📊"
          title="Price reference table is empty"
          description="No market price ranges exist yet. Add real Nigerian price benchmarks from recyclers and scrap dealers to enable AI pricing checks."
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add First Reference Range
            </Button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 text-dark-700 uppercase font-semibold border-b border-cream-200">
                <tr>
                  <th className="p-3.5">Material & Category</th>
                  <th className="p-3.5">Unit</th>
                  <th className="p-3.5">Benchmark Range (NGN)</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Sources</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {priceRefs.map((r: PriceReference) => (
                  <tr key={r.id} className="hover:bg-cream-50 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-dark-900">{r.material}</p>
                      <p className="text-[11px] text-dark-500 capitalize">{r.category}</p>
                    </td>
                    <td className="p-3.5 font-medium text-dark-700">{r.unit}</td>
                    <td className="p-3.5 font-semibold text-dark-900">
                      ₦{Number(r.min_ngn).toLocaleString()} – ₦{Number(r.max_ngn).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : r.status === 'proposed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-cream-200 text-dark-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-dark-600 max-w-xs truncate">
                      {Array.isArray(r.sources) && r.sources.length > 0 ? (
                        <span>{r.sources.length} documented source(s)</span>
                      ) : (
                        <span className="text-dark-400">None attached</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {r.status === 'proposed' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            className="bg-green-700 hover:bg-green-800 text-white text-[11px]"
                            onClick={() => approveMutation.mutate(r.id)}
                            isLoading={approveMutation.isPending}
                          >
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 text-[11px]"
                            onClick={() => rejectMutation.mutate(r.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {r.status === 'approved' && (
                        <span className="text-[11px] text-green-700 font-semibold flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Active for AI
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-cream-200 space-y-4">
            <h3 className="font-display font-bold text-lg text-dark-900">Add Material Price Reference Range</h3>
            <p className="text-xs text-dark-600">
              Input verified market prices in Naira (NGN). New ranges start as proposed and must be verified by an admin before use in AI review.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-800 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500"
                  >
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-800 mb-1">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">Material Name *</label>
                <input
                  type="text"
                  placeholder="e.g. PET Plastic Flakes (Clear)"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-800 mb-1">Min Price (NGN) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 350"
                    value={formData.min_ngn}
                    onChange={(e) => setFormData({ ...formData, min_ngn: e.target.value })}
                    className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-gold-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-800 mb-1">Max Price (NGN) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={formData.max_ngn}
                    onChange={(e) => setFormData({ ...formData, max_ngn: e.target.value })}
                    className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-gold-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-dark-800 mb-1">Verified Source URLs (one per line)</label>
                <textarea
                  rows={2}
                  placeholder="https://recycler-source.com/prices..."
                  value={formData.sources}
                  onChange={(e) => setFormData({ ...formData, sources: e.target.value })}
                  className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 font-mono focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-100">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Save Reference Range
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
