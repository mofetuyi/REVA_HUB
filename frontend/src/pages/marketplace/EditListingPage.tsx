import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingPage } from '../../components/ui/index'
import { MATERIAL_CATEGORIES, UNITS, CONDITIONS, COLLECTION_METHODS, LAGOS_LGAS } from '../../lib/nigeriaData'

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      const res = await api.get(`/listings/${id}`)
      return res.data
    },
  })

  const [form, setForm] = useState({
    title: '',
    category: 'plastic',
    description: '',
    quantity: '',
    unit: 'kg',
    condition: 'used',
    condition_notes: '',
    price_ngn: '',
    collection_method: 'buyer_arranges',
    pickup_address: '',
    lga: '',
  })

  useEffect(() => {
    if (listing) {
      setForm({
        title: listing.title || '',
        category: listing.category || 'plastic',
        description: listing.description || '',
        quantity: String(listing.quantity || ''),
        unit: listing.unit || 'kg',
        condition: listing.condition || 'used',
        condition_notes: listing.condition_notes || '',
        price_ngn: String(listing.price_ngn || ''),
        collection_method: listing.collection_method || 'buyer_arranges',
        pickup_address: listing.pickup_address || '',
        lga: listing.lga || '',
      })
    }
  }, [listing])

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/listings/${id}`, data),
    onSuccess: () => {
      toast.success('Listing updated!')
      queryClient.invalidateQueries({ queryKey: ['listing', id] })
      navigate(`/listings/${id}`)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      title: form.title,
      category: form.category,
      description: form.description,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      condition: form.condition,
      condition_notes: form.condition_notes,
      price_ngn: parseFloat(form.price_ngn),
      collection_method: form.collection_method,
      pickup_address: form.pickup_address,
      lga: form.lga,
    })
  }

  if (isLoading) return <LoadingPage />

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-lg text-dark-500 hover:bg-cream-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl font-bold text-dark-900">Edit Material Listing</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-cream-200 space-y-4">
        <Input
          label="Listing Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500"
            >
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">Lagos LGA</label>
            <select
              value={form.lga}
              onChange={(e) => setForm({ ...form, lga: e.target.value })}
              className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500"
            >
              {LAGOS_LGAS.map((lga) => (
                <option key={lga} value={lga}>{lga}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark-800 mb-1">Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full text-xs border border-cream-300 rounded-xl p-3 focus:ring-2 focus:ring-gold-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity"
            type="number"
            step="any"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price in Naira (NGN)"
            type="number"
            value={form.price_ngn}
            onChange={(e) => setForm({ ...form, price_ngn: e.target.value })}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-dark-800 mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="w-full text-xs border border-cream-300 rounded-xl px-3 py-2 bg-cream-50 focus:ring-2 focus:ring-gold-500"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-cream-100">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save Updates
          </Button>
        </div>
      </form>
    </div>
  )
}
