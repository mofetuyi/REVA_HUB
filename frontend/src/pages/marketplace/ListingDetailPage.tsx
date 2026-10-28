import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Package, Star, Eye, Calendar, Flag, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { StatusBadge, VerifiedSellerBadge, RatingStars, EmptyState, LoadingPage, PriceDisplay } from '../../components/ui/index'
import { MATERIAL_CATEGORIES, LISTING_CONDITIONS, COLLECTION_METHODS, formatNGN, formatDate } from '../../lib/nigeriaData'
import type { Listing } from '../../types'

function OfferModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [price, setPrice] = React.useState('')
  const [message, setMessage] = React.useState('')
  const queryClient = useQueryClient()

  const { data: aiOffer, isLoading: loadingAi } = useQuery({
    queryKey: ['suggest-offer', listing.id],
    queryFn: async () => (await api.get(`/offers/suggest-offer/${listing.id}`)).data,
  })

  const offerMutation = useMutation({
    mutationFn: () => api.post('/offers', {
      listing_id: listing.id,
      proposed_price: parseFloat(price),
      message: message || undefined,
    }),
    onSuccess: () => {
      toast.success('Offer sent to seller!')
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      onClose()
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-dark-900/60 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Make an Offer</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-700 font-bold">✕</button>
        </div>

        <div className="text-sm text-dark-600">
          Listed price: <strong>{formatNGN(listing.price_ngn)}</strong> / {listing.unit}
        </div>

        {/* AI Suggested Offer Badge */}
        {aiOffer && (
          <div className="bg-gradient-to-r from-gold-50 to-amber-50 border border-gold-300 rounded-xl p-3 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gold-900 flex items-center gap-1">
                ⚡ AI Suggested Smart Offer
              </span>
              <span className="text-xs font-semibold bg-gold-200 text-gold-900 px-2 py-0.5 rounded-full">
                {aiOffer.discount_pct}% below asking
              </span>
            </div>
            <p className="text-xs text-dark-700 leading-relaxed">{aiOffer.rationale}</p>
            <button
              type="button"
              onClick={() => setPrice(aiOffer.suggested_price.toString())}
              className="mt-1 text-xs font-bold text-gold-700 hover:text-gold-900 underline flex items-center gap-1"
            >
              <span>Use this AI price: {formatNGN(aiOffer.suggested_price)}</span>
              <span>→</span>
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-dark-800 mb-1">Your offer price (₦) *</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={`e.g. ${Math.round(listing.price_ngn * 0.9).toLocaleString()}`}
            className="w-full px-3 py-2 border border-cream-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400 font-medium"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-800 mb-1">Message to seller (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Ready for immediate pickup with my own truck…"
            rows={3}
            className="w-full px-3 py-2 border border-cream-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none text-sm"
          />
        </div>

        <p className="text-xs text-dark-500">⏱ Offers expire automatically after 7 days if not accepted.</p>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => offerMutation.mutate()}
            loading={offerMutation.isPending}
            disabled={!price || parseFloat(price) <= 0}
            className="flex-1"
          >
            Send Offer
          </Button>
        </div>
      </div>
    </div>
  )
}

function CheckoutModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [deliveryMethod, setDeliveryMethod] = React.useState<'self_pickup' | 'own_courier' | 'reva_logistics'>('self_pickup')
  const [buyerPhone, setBuyerPhone] = React.useState(user?.phone || '')
  const [buyerAddress, setBuyerAddress] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [quantity, setQuantity] = React.useState(listing.quantity || 1)
  const [paymentConfirmed, setPaymentConfirmed] = React.useState(false)

  const totalAmount = (listing.price_ngn || 0) * (quantity || 1)
  const paystackUrl = `https://paystack.shop/pay/13c70vrnsm?amount=${encodeURIComponent(totalAmount)}&price=${encodeURIComponent(totalAmount)}&product=${encodeURIComponent(listing.title)}&name=${encodeURIComponent(user?.name || '')}&email=${encodeURIComponent(user?.email || '')}&phone=${encodeURIComponent(buyerPhone || user?.phone || '')}&reva_id=${encodeURIComponent(user?.reva_id || '')}`

  const checkoutMutation = useMutation({
    mutationFn: () => api.post('/orders/checkout', {
      listing_id: listing.id,
      quantity: Number(quantity),
      delivery_method: deliveryMethod,
      buyer_phone: buyerPhone || undefined,
      buyer_delivery_address: buyerAddress || undefined,
      notes: notes || undefined,
      payment_reference: paymentConfirmed ? `paystack_direct_${Date.now()}` : undefined,
    }),
    onSuccess: (res) => {
      toast.success('Order placed successfully! Funds secured in Reva Escrow.')
      onClose()
      navigate('/orders')
    },
    onError: (err) => toast.error(extractError(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-dark-900/60 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-3 border-cream-200">
          <div>
            <h2 className="text-xl font-display font-bold text-dark-900">Instant Checkout & Escrow</h2>
            <p className="text-xs text-dark-500">Held in licensed escrow until you inspect & confirm delivery</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-700 font-bold text-lg">✕</button>
        </div>

        {/* Item Summary */}
        <div className="bg-cream-50 p-3.5 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-bold text-dark-900 text-sm">{listing.title}</p>
            <p className="text-xs text-dark-500">{formatNGN(listing.price_ngn)} per {listing.unit}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-dark-500 uppercase tracking-wider block font-semibold">Total Amount</span>
            <span className="text-lg font-bold text-gold-600 font-display">{formatNGN(totalAmount)}</span>
          </div>
        </div>

        {/* Fulfillment Options */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-dark-800 uppercase tracking-wider">
            Choose Delivery / Logistics Option *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setDeliveryMethod('self_pickup')}
              className={`p-3 rounded-xl border text-left transition-all ${deliveryMethod === 'self_pickup' ? 'border-gold-500 bg-gold-50 ring-1 ring-gold-400 font-semibold' : 'border-cream-200 hover:border-cream-300'}`}
            >
              <span className="text-base block mb-1">🏢</span>
              <strong className="block text-dark-900">Self-Pickup</strong>
              <p className="text-[11px] text-dark-500 mt-0.5">Pick up directly from seller</p>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryMethod('own_courier')}
              className={`p-3 rounded-xl border text-left transition-all ${deliveryMethod === 'own_courier' ? 'border-gold-500 bg-gold-50 ring-1 ring-gold-400 font-semibold' : 'border-cream-200 hover:border-cream-300'}`}
            >
              <span className="text-base block mb-1">🚚</span>
              <strong className="block text-dark-900">Own Courier</strong>
              <p className="text-[11px] text-dark-500 mt-0.5">Dispatch your rider to seller</p>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryMethod('reva_logistics')}
              className={`p-3 rounded-xl border text-left transition-all ${deliveryMethod === 'reva_logistics' ? 'border-gold-500 bg-gold-50 ring-1 ring-gold-400 font-semibold' : 'border-cream-200 hover:border-cream-300'}`}
            >
              <span className="text-base block mb-1">📦</span>
              <strong className="block text-dark-900">Reva Logistics</strong>
              <p className="text-[11px] text-dark-500 mt-0.5">Partner truck delivery to you</p>
            </button>
          </div>
        </div>

        {/* Dynamic Address & Contact based on user selection */}
        {deliveryMethod === 'self_pickup' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 text-blue-900">
            <p className="font-bold">📍 Seller Pickup Point & Contact:</p>
            <p><strong>Pickup Address:</strong> {listing.pickup_address || `${listing.lga}, Lagos, Nigeria`}</p>
            <p><strong>Seller Contact Phone:</strong> {listing.seller?.phone || 'Shown upon order placement'}</p>
          </div>
        )}

        {deliveryMethod === 'own_courier' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 text-blue-900">
            <p className="font-bold">📍 Pickup Location for Your Courier / Dispatch Rider:</p>
            <p><strong>Address:</strong> {listing.pickup_address || `${listing.lga}, Lagos, Nigeria`}</p>
            <p><strong>Seller Contact Phone:</strong> {listing.seller?.phone || 'Shown for dispatch coordination'}</p>
          </div>
        )}

        {deliveryMethod === 'reva_logistics' && (
          <div className="space-y-2.5 bg-cream-50 p-3.5 rounded-xl border border-cream-200 text-xs">
            <p className="font-bold text-dark-900">📦 Delivery Address Details (Reva Hub Logistics Partners):</p>
            <div>
              <label className="block text-dark-700 font-medium mb-1">Your Delivery Phone Number *</label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="+2348012345678"
                className="w-full px-3 py-2 bg-white border border-cream-200 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-dark-700 font-medium mb-1">Delivery Street Address & Landmark in Lagos *</label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="e.g. 14 Commercial Ave, Sabo Yaba, Lagos"
                className="w-full px-3 py-2 bg-white border border-cream-200 rounded-lg text-xs"
                required
              />
            </div>
          </div>
        )}

        {/* Paystack Payment Section with autofilled amount & payment link */}
        <div className="border border-gold-300 bg-gold-50/60 p-4 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-900">Paystack Escrow Protection</span>
            <span className="text-xs font-mono font-bold text-gold-700">Autofill: {formatNGN(totalAmount)}</span>
          </div>
          <p className="text-[11px] text-dark-600 leading-snug">
            Pay safely via Paystack. Funds remain safely in escrow. Once you confirm delivery, Paystack automatically transfers <strong>94%</strong> directly to the seller.
          </p>
          <a
            href={paystackUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPaymentConfirmed(true)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>Pay {formatNGN(totalAmount)} on Paystack (Price Autofilled)</span>
            <span>↗</span>
          </a>
          <label className="flex items-center gap-2 text-xs text-dark-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={paymentConfirmed}
              onChange={(e) => setPaymentConfirmed(e.target.checked)}
              className="rounded text-gold-500 focus:ring-gold-400"
            />
            <span>I have paid on Paystack</span>
          </label>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => checkoutMutation.mutate()}
            loading={checkoutMutation.isPending}
            className="flex-1 bg-gold-500 hover:bg-gold-600 text-dark-900 font-bold"
          >
            Confirm & Place Order
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, isAuthenticated } = useAuthStore()
  const [photoIdx, setPhotoIdx] = React.useState(0)
  const [offerModalOpen, setOfferModalOpen] = React.useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = React.useState(false)
  const [flagOpen, setFlagOpen] = React.useState(false)

  const { data: listing, isLoading, error } = useQuery<Listing>({
    queryKey: ['listing', id],
    queryFn: async () => (await api.get(`/listings/${id}`)).data,
  })

  const { data: related } = useQuery({
    queryKey: ['listing-related', id],
    queryFn: async () => (await api.get(`/listings/${id}/related`)).data,
    enabled: !!listing,
  })

  const { data: learnMaterials } = useQuery({
    queryKey: ['listing-learn-materials', listing?.id],
    queryFn: async () => [], // placeholder - would search tutorials by category
    enabled: !!listing,
  })

  const flagMutation = useMutation({
    mutationFn: (reason: string) => api.post(`/listings/${listing?.id}/flag`, { reason }),
    onSuccess: () => { toast.success('Listing reported. Our team will review it.'); setFlagOpen(false) },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />
  if (error || !listing) return (
    <EmptyState icon="🔍" title="Listing not found" description="This listing may have been removed or is no longer available." />
  )

  const category = MATERIAL_CATEGORIES.find(c => c.value === listing.category)
  const condition = LISTING_CONDITIONS.find(c => c.value === listing.condition)
  const collection = COLLECTION_METHODS.find(c => c.value === listing.collection_method)
  const isOwn = user && listing.seller && str(listing.seller?.id) === str(user.id)
  const isBuyer = isAuthenticated && !isOwn

  function str(val: any) { return String(val || '') }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-dark-500 hover:text-dark-800 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to browse
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Photos */}
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-cream-100 relative">
            {listing.photos.length > 0 ? (
              <img
                src={listing.photos[photoIdx]?.url}
                alt={`${listing.title} photo ${photoIdx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl opacity-30">
                {category?.icon}
              </div>
            )}
            {listing.photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx((i) => Math.max(0, i - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow" aria-label="Previous photo">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPhotoIdx((i) => Math.min(listing.photos.length - 1, i + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow" aria-label="Next photo">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {listing.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {listing.photos.map((p, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)} className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIdx ? 'border-gold-500' : 'border-transparent'}`}>
                  <img src={p.url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="badge bg-dark-800 text-cream-50">{category?.icon} {category?.label}</span>
              <StatusBadge status={listing.condition} />
            </div>
            <h1 className="text-2xl font-display font-bold text-dark-900">{listing.title}</h1>
            <div className="flex items-center gap-3 text-sm text-dark-500 mt-1">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {listing.view_count} views</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(listing.listed_at)}</span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <PriceDisplay amount={listing.price_ngn} className="text-3xl" />
            <span className="text-dark-500 text-sm">for {listing.quantity} {listing.unit}</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-dark-400 mt-0.5 flex-shrink-0" />
              <span>{listing.lga}, Lagos{listing.pickup_address ? ` — ${listing.pickup_address}` : ''}</span>
            </div>
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-dark-400 mt-0.5 flex-shrink-0" />
              <span>{collection?.label}</span>
            </div>
          </div>

          <div className="bg-cream-50 rounded-xl p-4">
            <h3 className="font-semibold text-dark-800 mb-2 text-sm">Description</h3>
            <p className="text-dark-700 text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            {listing.condition_notes && (
              <p className="text-dark-500 text-sm mt-2 italic">Condition notes: {listing.condition_notes}</p>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-2">
            {isBuyer && (
              <div className="space-y-2">
                <Button fullWidth size="lg" onClick={() => setCheckoutModalOpen(true)} className="bg-gold-500 hover:bg-gold-600 text-dark-900 font-bold shadow-md">
                  Buy Now · Paystack Escrow
                </Button>
                <Button variant="secondary" fullWidth size="lg" onClick={() => setOfferModalOpen(true)}>
                  ⚡ Make an Offer (AI Suggested)
                </Button>
              </div>
            )}
            {isOwn && (
              <Link to={`/listings/${listing.id}/edit`}>
                <Button variant="secondary" fullWidth>Edit Listing</Button>
              </Link>
            )}
            {!isAuthenticated && (
              <div className="space-y-2">
                <Link to="/login">
                  <Button fullWidth size="lg">Log in to Buy or Make Offer</Button>
                </Link>
              </div>
            )}
            {isAuthenticated && !isOwn && (
              <button
                onClick={() => setFlagOpen(true)}
                className="flex items-center gap-1 text-xs text-dark-400 hover:text-red-500 transition-colors mx-auto"
              >
                <Flag className="w-3 h-3" /> Report listing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seller profile */}
      {listing.seller && (
        <div className="card p-5 mt-6">
          <h2 className="font-display font-bold text-lg mb-3">About the Seller</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gold-500 flex items-center justify-center text-dark-900 font-bold text-xl">
              {listing.seller.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/profile/${listing.seller.id}`} className="font-semibold hover:text-gold-600">
                  {listing.seller.name}
                </Link>
                {listing.seller.is_verified_seller && <VerifiedSellerBadge />}
              </div>
              <div className="flex items-center gap-3 text-sm text-dark-500 mt-0.5">
                <RatingStars rating={listing.seller.average_rating} size="sm" />
                <span>({listing.seller.review_count} reviews)</span>
                <span>📍 {listing.seller.lga}</span>
              </div>
              <p className="text-xs text-dark-400 mt-0.5">Member since {formatDate(listing.seller.member_since)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Related listings */}
      {related && related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-display font-bold mb-4">Similar Listings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((r: Listing) => (
              <Link key={r.id} to={`/listings/${r.slug}`} className="card hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] bg-cream-100">
                  {r.photos[0] && <img src={r.photos[0].url} alt={r.title} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-gold-600 font-semibold text-sm">{formatNGN(r.price_ngn)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Offer modal */}
      {offerModalOpen && listing && (
        <OfferModal listing={listing} onClose={() => setOfferModalOpen(false)} />
      )}

      {/* Checkout modal */}
      {checkoutModalOpen && listing && (
        <CheckoutModal listing={listing} onClose={() => setCheckoutModalOpen(false)} />
      )}

      {/* Flag modal */}
      {flagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/60" onClick={() => setFlagOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg">Report Listing</h2>
            <p className="text-sm text-dark-600">Why are you reporting this listing?</p>
            <div className="space-y-2">
              {['Prohibited item', 'Counterfeit/stolen goods', 'Hazardous material', 'Misleading description', 'Other'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => flagMutation.mutate(reason)}
                  disabled={flagMutation.isPending}
                  className="w-full text-left px-4 py-2.5 rounded-lg border border-cream-200 hover:border-red-300 hover:bg-red-50 text-sm transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
            <Button variant="secondary" fullWidth onClick={() => setFlagOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
