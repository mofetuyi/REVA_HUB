import React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Upload, X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { LAGOS_LGAS, MATERIAL_CATEGORIES, RAW_MATERIAL_CATEGORIES, UPCYCLED_PRODUCT_CATEGORIES, LISTING_UNITS, LISTING_CONDITIONS, COLLECTION_METHODS } from '../../lib/nigeriaData'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  product_group: z.enum(['circular_materials', 'upcycled_products', 'raw_materials']).default('circular_materials'),
  category: z.string().min(1, 'Select a category'),
  description: z.string().min(20, 'Please provide a more detailed description'),
  quantity: z.number({ invalid_type_error: 'Enter a number' }).positive('Must be > 0'),
  unit: z.enum(['kg', 'tonnes', 'bags', 'pieces', 'bundles', 'litres']),
  condition: z.enum(['new', 'like_new', 'used', 'mixed']),
  condition_notes: z.string().optional(),
  price_ngn: z.number({ invalid_type_error: 'Enter a number' }).positive('Must be > 0'),
  lga: z.string().min(1, 'Select your LGA'),
  pickup_address: z.string().optional(),
  collection_method: z.string().default('delivery'),
  photo_urls: z.array(z.string().url()).min(1, 'At least one photo required').max(5),
})

type FormData = z.infer<typeof schema>

export default function CreateListingPage() {
  const navigate = useNavigate()
  const [uploading, setUploading] = React.useState(false)
  const [photos, setPhotos] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { product_group: 'circular_materials', collection_method: 'delivery', unit: 'kg', condition: 'used' },
  })

  const category = watch('category')
  const productGroup = watch('product_group') || 'circular_materials'

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/listings', { ...data, photo_urls: photos }),
    onSuccess: (res) => {
      toast.success('Listing submitted for review!')
      navigate(`/listings/${res.data.slug || res.data.id}`)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed')
      return
    }
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await api.post('/listings/upload-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const newPhotos = [...photos, res.data.url]
        setPhotos(newPhotos)
        setValue('photo_urls', newPhotos, { shouldValidate: true })
      }
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx)
    setPhotos(next)
    setValue('photo_urls', next, { shouldValidate: true })
  }

  const onSubmit = (data: FormData) => {
    createMutation.mutate({ ...data, photo_urls: photos })
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-1">Create a Listing</h1>
      <p className="text-dark-600 text-sm mb-6">List your recovered materials for Lagos buyers</p>

      {/* Prohibited items warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Prohibited items:</strong> Hazardous waste (batteries, chemicals, electronics), medical waste, counterfeit or stolen goods, and anything illegal in Nigeria will be removed. All listings are reviewed before going live.
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Photos */}
        <div>
          <label className="label">Photos <span className="text-red-500">*</span> <span className="text-dark-400 font-normal">(1–5 photos)</span></label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-cream-100">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-dark-900/70 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
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
                className="aspect-square rounded-lg border-2 border-dashed border-cream-200 hover:border-gold-400 flex flex-col items-center justify-center gap-1 transition-colors"
                aria-label="Upload photo"
              >
                <Upload className="w-5 h-5 text-dark-400" />
                <span className="text-xs text-dark-400">{uploading ? 'Uploading…' : 'Add photo'}</span>
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
          {errors.photo_urls && <p className="text-sm text-red-600">{errors.photo_urls.message}</p>}
          <p className="text-xs text-dark-400">JPEG/PNG/WebP, max 10MB each. Photos are compressed automatically.</p>
        </div>

        <Input label="Listing title" placeholder="e.g. Clean plastic bottles — 50kg bales" required {...register('title')} error={errors.title?.message} />

        {/* Product Group Selector */}
        <div>
          <label className="label">Product Group Hub <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <button
              type="button"
              onClick={() => {
                setValue('product_group', 'circular_materials')
                setValue('category', 'circular_products')
              }}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                productGroup !== 'upcycled_products'
                  ? 'border-brandGreen-800 bg-brandGreen-50 ring-1 ring-brandGreen-800'
                  : 'border-cream-200 hover:border-brandGreen-300 bg-white'
              }`}
            >
              <div className="font-bold text-dark-900 text-sm flex items-center gap-1.5">
                <span>🌿</span> Reva Hub
              </div>
              <p className="text-xs text-dark-500 mt-1">Organic byproducts, rice husk, palm shells, plastics & recovered feedstocks</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('product_group', 'upcycled_products')
                setValue('category', 'furniture')
              }}
              className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                productGroup === 'upcycled_products'
                  ? 'border-gold-500 bg-gold-50 ring-1 ring-gold-500'
                  : 'border-cream-200 hover:border-gold-300 bg-white'
              }`}
            >
              <div className="font-bold text-dark-900 text-sm flex items-center gap-1.5">
                <span>✨</span> Upcycled Products Hub
              </div>
              <p className="text-xs text-dark-500 mt-1">Refurbished furniture, student desks, circular fashion & handmade wares</p>
            </button>
          </div>
        </div>

        <div>
          <label className="label">Category <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(productGroup === 'upcycled_products' ? UPCYCLED_PRODUCT_CATEGORIES : RAW_MATERIAL_CATEGORIES).map((c) => (
              <label key={c.value} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors text-sm ${category === c.value ? 'border-gold-500 bg-gold-50 font-semibold' : 'border-cream-200 hover:border-gold-300'}`}>
                <input type="radio" value={c.value} className="sr-only" {...register('category')} />
                <span>{c.icon}</span>
                <span className="font-medium">{c.label}</span>
              </label>
            ))}
          </div>
          {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>}
        </div>

        <div>
          <label className="label">Description <span className="text-red-500">*</span></label>
          <textarea
            rows={4}
            placeholder="Describe the materials: source, quality, any issues, how you acquired them…"
            className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm resize-none"
            {...register('description')}
          />
          {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Quantity <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="e.g. 50"
              className="input-field"
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && <p className="text-sm text-red-600">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="label">Unit <span className="text-red-500">*</span></label>
            <select className="input-field" {...register('unit')}>
              {LISTING_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Condition <span className="text-red-500">*</span></label>
            <select className="input-field" {...register('condition')}>
              {LISTING_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Price (₦) <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 15000"
              className="input-field"
              {...register('price_ngn', { valueAsNumber: true })}
            />
            {errors.price_ngn && <p className="text-sm text-red-600">{errors.price_ngn.message}</p>}
          </div>
        </div>

        <Input label="Condition notes (optional)" placeholder="Any additional details about condition…" {...register('condition_notes')} />

        <div>
          <label className="label">Lagos LGA <span className="text-red-500">*</span></label>
          <select className="input-field" {...register('lga')}>
            <option value="">Select your LGA</option>
            {LAGOS_LGAS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {errors.lga && <p className="text-sm text-red-600">{errors.lga.message}</p>}
        </div>

        <Input label="Dispatch Location / Item Address in Lagos (optional)" placeholder="e.g. 12 Adekunle Street, Surulere, Lagos" {...register('pickup_address')} />

        <div className="p-3.5 bg-cream-50 rounded-xl border border-cream-200 text-xs text-dark-600 flex items-center gap-2.5">
          <span className="text-base">🚚</span>
          <span><strong>Direct Doorstep Delivery:</strong> Self-pickup is disabled. Buyers provide their Lagos delivery address directly at checkout for doorstep courier dispatch.</span>
        </div>

        <div className="bg-cream-50 rounded-xl p-4 text-sm text-dark-600">
          <strong>📋 Listing review:</strong> Your listing will be reviewed by our team before going live. You'll be notified once it's approved. This usually takes a few hours.
        </div>

        <Button type="submit" fullWidth size="lg" loading={createMutation.isPending}>
          Submit Listing
        </Button>
      </form>
    </div>
  )
}
