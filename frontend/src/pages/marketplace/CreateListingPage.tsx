import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { Upload, X, AlertTriangle, Sparkles, CheckCircle2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import {
  LAGOS_LGAS,
  RAW_MATERIAL_CATEGORIES,
  UPCYCLED_PRODUCT_CATEGORIES,
  LISTING_UNITS,
  LISTING_CONDITIONS,
} from '../../lib/nigeriaData'

const SAMPLE_CATEGORY_PHOTOS: Record<string, string> = {
  circular_products: '/uploads/coconut_husk_coir_fiber.jpg',
  organic_products: '/uploads/banana_plantain_peels_biomass.jpg',
  plastic: '/uploads/pet_plastic_flakes.jpg',
  wood: '/uploads/reclaimed_wood_pallets.jpg',
  cardboard: '/uploads/cardboard_bales_occ.jpg',
  clothes: '/uploads/upcycled_denim_bundles.jpg',
  fabric: '/uploads/textile_fabric_scraps.jpg',
  leather: '/uploads/leather_tan_roll.jpg',
  furniture: '/uploads/dasa_recycled_plastic_stool.jpg',
  fashion: '/uploads/ankara_tote_bags.jpg',
  crafts: '/uploads/leather_journal_notebook.jpg',
  other: '/uploads/pet_plastic_flakes.jpg',
}

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  product_group: z.enum(['circular_materials', 'upcycled_products', 'raw_materials']).default('circular_materials'),
  category: z.string().min(1, 'Select a category'),
  description: z.string().min(10, 'Please provide a description (at least 10 characters)'),
  quantity: z.number({ invalid_type_error: 'Enter a valid quantity' }).positive('Must be > 0'),
  unit: z.enum(['kg', 'tonnes', 'bags', 'pieces', 'bundles', 'litres']),
  condition: z.enum(['new', 'like_new', 'used', 'mixed']),
  condition_notes: z.string().optional(),
  price_ngn: z.number({ invalid_type_error: 'Enter a price in Naira' }).positive('Must be > 0'),
  lga: z.string().min(1, 'Select your Lagos LGA'),
  pickup_address: z.string().optional(),
  collection_method: z.string().default('delivery'),
  photo_urls: z.array(z.string()).optional(),
})

type FormData = z.infer<typeof schema>

export default function CreateListingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, mode, switchMode } = useAuthStore()

  const [uploading, setUploading] = React.useState(false)
  const [photos, setPhotos] = React.useState<string[]>([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      product_group: 'circular_materials',
      category: 'circular_products',
      collection_method: 'delivery',
      unit: 'kg',
      condition: 'used',
      quantity: 1,
      price_ngn: 5000,
      lga: user?.lga || LAGOS_LGAS[0] || 'Ikeja',
    },
  })

  const category = watch('category') || 'circular_products'
  const productGroup = watch('product_group') || 'circular_materials'

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        photo_urls: photos.length > 0 ? photos : [SAMPLE_CATEGORY_PHOTOS[data.category] || '/uploads/pet_plastic_flakes.jpg'],
      }
      return api.post('/listings', payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['my-listings'] })
      toast.success('Product published successfully! It is now live across Reva Hub.')
      navigate(`/listings/${res.data.slug || res.data.id}`)
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed')
      return
    }
    setUploading(true)
    try {
      let updatedPhotos = [...photos]
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
      setValue('photo_urls', updatedPhotos, { shouldValidate: true })
      toast.success('Photo uploaded successfully!')
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

  const applySamplePhoto = () => {
    const sample = SAMPLE_CATEGORY_PHOTOS[category] || '/uploads/pet_plastic_flakes.jpg'
    const next = [sample]
    setPhotos(next)
    setValue('photo_urls', next, { shouldValidate: true })
    toast.success('Applied verified sample material photo!')
  }

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data)
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-cream-200 shadow-sm text-center">
        <div className="w-14 h-14 mx-auto mb-4 bg-brandGreen-50 text-brandGreen-800 rounded-2xl flex items-center justify-center text-2xl">
          <Lock className="w-6 h-6 text-brandGreen-800" />
        </div>
        <h2 className="text-xl font-display font-bold text-dark-900 mb-2">Sign In to Post a Product</h2>
        <p className="text-sm text-dark-500 mb-6">
          You need an active Reva account to list circular products or materials for buyers in Lagos.
        </p>
        <Link
          to="/login"
          state={{ from: '/listings/new' }}
          className="inline-flex items-center justify-center w-full py-3 px-6 bg-[#062E12] hover:bg-[#08421a] text-white font-bold rounded-xl shadow-sm transition-colors text-sm"
        >
          Sign In / Create Account
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-dark-900">Post a Product or Material</h1>
          <p className="text-dark-600 text-sm mt-0.5">Publish your circular inventory directly to Lagos buyers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-800 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            Instant Live Publishing
          </span>
        </div>
      </div>

      {/* Seller mode active pill */}
      <div className="bg-brandGreen-50/70 border border-brandGreen-200/80 rounded-2xl p-3.5 mb-6 flex items-center justify-between text-xs text-brandGreen-900">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">💼</span>
          <div>
            <span className="font-bold">Posting as {user?.name || 'Verified Trader'}</span>
            <span className="text-dark-500 block text-[11px]">Lagos Seller Account Active • Payouts via Paystack Escrow</span>
          </div>
        </div>
        {mode !== 'seller' && (
          <button
            type="button"
            onClick={() => switchMode('seller')}
            className="text-xs font-bold text-brandGreen-800 underline hover:text-brandGreen-950"
          >
            Activate Seller Mode
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Photos */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">
              Product Photos <span className="text-dark-400 font-normal">(Up to 5 images)</span>
            </label>
            {photos.length === 0 && (
              <button
                type="button"
                onClick={applySamplePhoto}
                className="text-xs font-semibold text-gold-700 hover:text-gold-900 flex items-center gap-1 underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Use Sample Photo
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-cream-100 border border-cream-300 shadow-sm">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-dark-900/80 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors"
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
                className="aspect-square rounded-xl border-2 border-dashed border-cream-300 hover:border-brandGreen-600 hover:bg-brandGreen-50/40 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer bg-white"
                aria-label="Upload photo"
              >
                <Upload className="w-5 h-5 text-dark-500" />
                <span className="text-[11px] font-semibold text-dark-600">
                  {uploading ? 'Uploading…' : '+ Add Photo'}
                </span>
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
          <p className="text-xs text-dark-400 mt-1">
            Supports JPEG, PNG, or WebP. If you don't have a photo right now, a verified category visual will be assigned automatically.
          </p>
        </div>

        {/* Product Group Selector */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm">
          <label className="label">1. Select Product Hub <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                setValue('product_group', 'circular_materials')
                setValue('category', 'circular_products')
              }}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                productGroup !== 'upcycled_products'
                  ? 'border-brandGreen-800 bg-brandGreen-50/70 ring-2 ring-brandGreen-800/20 shadow-sm'
                  : 'border-cream-200 hover:border-brandGreen-300 bg-white'
              }`}
            >
              <div className="font-bold text-dark-900 text-sm flex items-center gap-2">
                <span className="text-lg">🌿</span> Reva Hub (Circular Materials)
              </div>
              <p className="text-xs text-dark-500 mt-1">
                Agro-biomass, palm shells, plantain peels, coconut coir, recovered plastic flakes & bales
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setValue('product_group', 'upcycled_products')
                setValue('category', 'furniture')
              }}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                productGroup === 'upcycled_products'
                  ? 'border-gold-500 bg-gold-50/70 ring-2 ring-gold-500/20 shadow-sm'
                  : 'border-cream-200 hover:border-gold-300 bg-white'
              }`}
            >
              <div className="font-bold text-dark-900 text-sm flex items-center gap-2">
                <span className="text-lg">✨</span> Upcycled Products Hub
              </div>
              <p className="text-xs text-dark-500 mt-1">
                Refurbished furniture, student desks, circular fashion, tote bags, artisan leather goods
              </p>
            </button>
          </div>

          <label className="label">2. Category <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(productGroup === 'upcycled_products' ? UPCYCLED_PRODUCT_CATEGORIES : RAW_MATERIAL_CATEGORIES).map((c) => (
              <label
                key={c.value}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors text-sm ${
                  category === c.value
                    ? 'border-brandGreen-800 bg-brandGreen-50 font-bold text-brandGreen-950'
                    : 'border-cream-200 hover:border-brandGreen-300 text-dark-700 bg-white'
                }`}
              >
                <input
                  type="radio"
                  value={c.value}
                  className="sr-only"
                  {...register('category')}
                  onChange={() => setValue('category', c.value, { shouldValidate: true })}
                />
                <span className="text-base">{c.icon}</span>
                <span className="text-xs sm:text-sm">{c.label}</span>
              </label>
            ))}
          </div>
          {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>}
        </div>

        {/* Product Details */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm space-y-4">
          <Input
            label="Listing Title"
            placeholder="e.g. Sorted Clean Rice Husk Bales (Grade A)"
            required
            {...register('title')}
            error={errors.title?.message}
          />

          <div>
            <label className="label">Description <span className="text-red-500">*</span></label>
            <textarea
              rows={4}
              placeholder="Describe origin, quality, moisture level, batch availability, and handling..."
              className="w-full px-3 py-2.5 border border-cream-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brandGreen-600 text-sm resize-none"
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity Available <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="any"
                min="0.1"
                placeholder="e.g. 50"
                className="input-field"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>}
            </div>
            <div>
              <label className="label">Measurement Unit <span className="text-red-500">*</span></label>
              <select className="input-field" {...register('unit')}>
                {LISTING_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Item Condition <span className="text-red-500">*</span></label>
              <select className="input-field" {...register('condition')}>
                {LISTING_CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Price (₦ NGN) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 25000"
                className="input-field font-semibold text-brandGreen-900"
                {...register('price_ngn', { valueAsNumber: true })}
              />
              {errors.price_ngn && <p className="text-sm text-red-600 mt-1">{errors.price_ngn.message}</p>}
            </div>
          </div>

          <Input
            label="Condition Notes (optional)"
            placeholder="e.g. Washed and dried, packed in 50kg raffia bags"
            {...register('condition_notes')}
          />
        </div>

        {/* Location & Delivery */}
        <div className="bg-white p-5 rounded-2xl border border-cream-200 shadow-sm space-y-4">
          <div>
            <label className="label">Dispatch Location LGA (Lagos) <span className="text-red-500">*</span></label>
            <select className="input-field" {...register('lga')}>
              {LAGOS_LGAS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            {errors.lga && <p className="text-sm text-red-600 mt-1">{errors.lga.message}</p>}
          </div>

          <Input
            label="Pickup / Warehouse Address in Lagos (optional)"
            placeholder="e.g. Plot 14 Industrial Avenue, Ikeja"
            {...register('pickup_address')}
          />

          <div className="p-3.5 bg-cream-50 rounded-xl border border-cream-200 text-xs text-dark-600 flex items-center gap-2.5">
            <span className="text-base">🚚</span>
            <span>
              <strong>Direct Doorstep Delivery:</strong> Buyers pay for delivery at checkout. Reva coordinates dispatch directly to the buyer's Lagos address.
            </span>
          </div>
        </div>

        {/* Prohibited items warning */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <strong>Prohibited Items:</strong> Hazardous materials, chemical or medical waste, stolen goods, and items prohibited under Nigerian law are strictly banned.
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={createMutation.isPending}
          className="bg-[#062E12] hover:bg-[#08421a] text-white font-bold py-4 text-base rounded-2xl shadow-lg transition-transform active:scale-[0.99]"
        >
          {createMutation.isPending ? 'Publishing Product...' : 'Publish Product to Marketplace'}
        </Button>
      </form>
    </div>
  )
}
