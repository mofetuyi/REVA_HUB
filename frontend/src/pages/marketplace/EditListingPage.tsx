import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])

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
    collection_method: 'delivery',
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
        collection_method: listing.collection_method || 'delivery',
        pickup_address: listing.pickup_address || '',
        lga: listing.lga || 'Ikeja',
      })
      if (listing.photos && Array.isArray(listing.photos)) {
        setPhotos(listing.photos.map((p: any) => p.url))
      }
    }
  }, [listing])

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed')
      return
    }
    setUploading(true)
    try {
      const updatedPhotos = [...photos]
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await api.post('/listings/upload-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        if (res.data?.url) {
          updatedPhotos.push(res.data.url)
        }
      }
      setPhotos(updatedPhotos)
      toast.success('Photo uploaded!')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx))
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/listings/${id}`, data),
    onSuccess: (res) => {
      toast.success('Listing updated!')
      queryClient.invalidateQueries({ queryKey: ['listing', id] })
      navigate(`/listings/${res.data?.slug || id}`)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (photos.length === 0) {
      toast.error('Please upload at least one photo of the material')
      return
    }
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
      photo_urls: photos,
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

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-cream-200 space-y-5">
        {/* Photos section */}
        <div>
          <label className="block text-xs font-semibold text-dark-800 mb-1">
            Listing Photos <span className="text-red-500">*</span> <span className="text-dark-400 font-normal">(1–5 photos)</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-cream-100 border border-cream-200">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-dark-900/70 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-cream-300 hover:border-gold-500 flex flex-col items-center justify-center gap-1 transition-colors"
                aria-label="Upload photo"
              >
                <Upload className="w-5 h-5 text-dark-400" />
                <span className="text-[11px] text-dark-500">{uploading ? 'Uploading…' : 'Add photo'}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => handlePhotoUpload(e.target.files)}
          />
          <p className="text-[11px] text-dark-400">JPEG/PNG/WebP. Photos are automatically compressed for high resolution and fast loading.</p>
        </div>

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
            label="Price (₦ NGN)"
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

        <Input
          label="Pickup / Inspection Address in Lagos"
          value={form.pickup_address}
          onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={updateMutation.isPending} className="flex items-center gap-1.5">
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
