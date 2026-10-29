import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, MapPin, Tag, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { StatusBadge, EmptyState, Spinner, VerifiedSellerBadge } from '../../components/ui/index'
import { MATERIAL_CATEGORIES, CIRCULAR_MATERIAL_CATEGORIES, RAW_MATERIAL_CATEGORIES, UPCYCLED_PRODUCT_CATEGORIES, LAGOS_LGAS, LISTING_CONDITIONS, COLLECTION_METHODS, formatNGN, formatRelativeDate } from '../../lib/nigeriaData'
import type { Listing, PaginatedResponse } from '../../types'

function ListingCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-[4/3] bg-cream-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-cream-100 rounded w-2/3" />
        <div className="h-3 bg-cream-100 rounded w-1/2" />
        <div className="h-5 bg-cream-100 rounded w-1/3 mt-2" />
      </div>
    </div>
  )
}

function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.photos[0]?.url
  const category = MATERIAL_CATEGORIES.find(c => c.value === listing.category)

  return (
    <Link to={`/listings/${listing.slug}`} className="card group hover:shadow-md transition-shadow">
      <div className="aspect-[4/3] bg-cream-100 overflow-hidden relative">
        {photo ? (
          <img
            src={photo}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">
            {category?.icon || '📦'}
          </div>
        )}
        <span className="absolute top-2 left-2 badge bg-dark-900/90 text-cream-50 text-xs backdrop-blur-xs">
          {category?.icon} {category?.label}
        </span>
        {listing.product_group === 'upcycled_products' ? (
          <span className="absolute top-2 right-2 badge bg-gold-500 text-brandGreen-950 font-bold text-[11px] border border-gold-300 shadow-sm">
            ✨ UPCYCLED
          </span>
        ) : (
          <span className="absolute top-2 right-2 badge bg-brandGreen-900 text-white font-bold text-[11px] border border-gold-500/30 shadow-sm">
            🌿 CIRCULAR MATERIAL
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-dark-900 truncate group-hover:text-gold-600 transition-colors">
          {listing.title}
        </h3>
        <div className="flex items-center gap-1 text-sm text-dark-500 mt-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span>{listing.lga}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-dark-900">{formatNGN(listing.price_ngn)}</span>
          <span className="text-xs text-dark-400">{formatRelativeDate(listing.listed_at)}</span>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="badge bg-cream-100 text-dark-700">
            {listing.quantity} {listing.unit}
          </span>
          <StatusBadge status={listing.condition} />
        </div>
        {listing.seller?.is_verified_seller && (
          <div className="mt-2">
            <VerifiedSellerBadge />
          </div>
        )}
      </div>
    </Link>
  )
}

export default function BrowsePage() {
  const [params, setParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = React.useState(false)

  const page = Number(params.get('page') || 1)
  const group = (params.get('group') as 'circular_materials' | 'raw_materials' | 'upcycled_products') || undefined
  const category = params.get('category') || undefined
  const lga = params.get('lga') || undefined
  const condition = params.get('condition') || undefined
  const search = params.get('search') || undefined
  const sort = params.get('sort') || 'newest'
  const priceMin = params.get('price_min') || undefined
  const priceMax = params.get('price_max') || undefined

  const { data, isLoading } = useQuery<PaginatedResponse<Listing>>({
    queryKey: ['listings', { page, group, category, lga, condition, search, sort, priceMin, priceMax }],
    queryFn: async () => {
      const res = await api.get('/listings', {
        params: { page, page_size: 20, group, category, lga, condition, search, sort, price_min: priceMin, price_max: priceMax },
      })
      return res.data
    },
  })

  function setParam(key: string, val: string | undefined) {
    const next = new URLSearchParams(params)
    if (val) next.set(key, val); else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }

  function clearFilters() {
    setParams({ page: '1' })
  }

  const hasFilters = !!(category || lga || condition || priceMin || priceMax)

  return (
    <div className="space-y-6">
      {/* Signature Reva Hero Banner: Dark Green, Crisp White & Rich Gold */}
      <div className="rounded-2xl bg-gradient-to-br from-brandGreen-950 via-brandGreen-900 to-brandGreen-950 text-white p-6 sm:p-8 border border-gold-500/30 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-400/50 text-gold-300 text-xs font-semibold tracking-wide">
            <span>✨ LAGOS CIRCULAR HUB</span>
            <span>•</span>
            <span className="text-white">RECOVERED STOCKS & RAW MATERIALS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight leading-tight">
            Buy & Sell Recovered Materials in Lagos
          </h1>
          <p className="text-cream-100 text-sm sm:text-base leading-relaxed max-w-2xl">
            Directly connect with certified recyclers, workshops, and makers trading clean PET flakes, timber, textile scraps, leather hides, cardboard bales, and upcycled circular products.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-white/90">
            <span className="flex items-center gap-1 bg-brandGreen-800/80 px-3 py-1 rounded-lg border border-gold-500/20">
              <span className="text-gold-400">✓</span> Instant Escrow Checkout
            </span>
            <span className="flex items-center gap-1 bg-brandGreen-800/80 px-3 py-1 rounded-lg border border-gold-500/20">
              <span className="text-gold-400">✓</span> Verified Lagos Suppliers
            </span>
            <span className="flex items-center gap-1 bg-brandGreen-800/80 px-3 py-1 rounded-lg border border-gold-500/20">
              <span className="text-gold-400">✓</span> Zero Landfill Waste
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-Group Switcher: Raw Materials vs Upcycled Products ── */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-cream-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="inline-flex p-1 bg-cream-100 rounded-xl gap-1">
            <button
              onClick={() => {
                const next = new URLSearchParams(params)
                next.delete('group')
                next.delete('category')
                next.set('page', '1')
                setParams(next)
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !group
                  ? 'bg-brandGreen-950 text-white shadow-sm'
                  : 'text-dark-700 hover:text-dark-900 hover:bg-white/70'
              }`}
            >
              🌟 All Items {data?.total !== undefined ? `(${data.total})` : ''}
            </button>
            <button
              onClick={() => {
                const next = new URLSearchParams(params)
                next.set('group', 'circular_materials')
                next.delete('category')
                next.set('page', '1')
                setParams(next)
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                group === 'circular_materials' || group === 'raw_materials'
                  ? 'bg-brandGreen-900 text-white shadow-sm border border-gold-500/40'
                  : 'text-dark-700 hover:text-dark-900 hover:bg-white/70'
              }`}
            >
              <span>🌿</span> Circular Products
            </button>
            <button
              onClick={() => {
                const next = new URLSearchParams(params)
                next.set('group', 'upcycled_products')
                next.delete('category')
                next.set('page', '1')
                setParams(next)
              }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                group === 'upcycled_products'
                  ? 'bg-gold-500 text-brandGreen-950 shadow-sm border border-gold-300'
                  : 'text-dark-700 hover:text-dark-900 hover:bg-white/70'
              }`}
            >
              <span>✨</span> Upcycled Products Hub
            </button>
          </div>

          <div className="text-xs font-medium text-dark-500 px-1">
            {group === 'circular_materials' || group === 'raw_materials' ? (
              <span className="text-brandGreen-900">
                🌿 <strong>Circular Products</strong>: Plantain peels, coconut shells, rice husk & palm kernel shells
              </span>
            ) : group === 'upcycled_products' ? (
              <span className="text-gold-700">
                ✨ <strong>Upcycled Products Hub</strong>: Restored furniture, student desks, circular denim fashion & lifestyle wares
              </span>
            ) : (
              <span>Trading recovered materials and artisan upcycled products in Lagos</span>
            )}
          </div>
        </div>

        {/* Dynamic Category Chips based on Group */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-cream-100">
          <button
            onClick={() => setParam('category', undefined)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
              !category
                ? 'bg-dark-900 text-white border-dark-900'
                : 'bg-white border-cream-200 text-dark-700 hover:border-gold-400'
            }`}
          >
            All {group === 'circular_materials' || group === 'raw_materials' ? 'Circular Products' : group === 'upcycled_products' ? 'Upcycled Goods' : 'Categories'}
          </button>
          {(group === 'circular_materials' || group === 'raw_materials'
            ? RAW_MATERIAL_CATEGORIES
            : group === 'upcycled_products'
            ? UPCYCLED_PRODUCT_CATEGORIES
            : MATERIAL_CATEGORIES
          ).map((c) => (
            <button
              key={c.value}
              onClick={() => setParam('category', c.value === category ? undefined : c.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                category === c.value
                  ? group === 'upcycled_products'
                    ? 'bg-gold-500 text-brandGreen-950 border-gold-400 shadow-xs'
                    : 'bg-brandGreen-900 text-white border-brandGreen-950 shadow-xs'
                  : 'bg-white border-cream-200 text-dark-700 hover:border-gold-400'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="search"
            placeholder="Search materials in Lagos…"
            value={search || ''}
            onChange={(e) => setParam('search', e.target.value || undefined)}
            className="w-full pl-10 pr-4 py-2.5 border border-cream-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm"
            aria-label="Search listings"
          />
        </div>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className="flex items-center gap-2 px-4 py-2.5 border border-cream-200 rounded-xl bg-white hover:bg-cream-50 text-sm font-medium relative"
          aria-label="Toggle filters"
          aria-expanded={filterOpen}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasFilters && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-500 rounded-full text-xs flex items-center justify-center text-dark-900 font-bold">!</span>
          )}
        </button>
        <select
          value={sort}
          onChange={(e) => setParam('sort', e.target.value)}
          className="hidden sm:block px-3 py-2.5 border border-cream-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
          aria-label="Sort by"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="most_viewed">Most viewed</option>
        </select>
      </div>

      {/* Expanded filter panel */}
      {filterOpen && (
        <div className="card p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-900">Filters</h3>
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm text-gold-600 hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-600 mb-1 uppercase tracking-wider">LGA</label>
              <select
                value={lga || ''}
                onChange={(e) => setParam('lga', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">All LGAs</option>
                {LAGOS_LGAS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-600 mb-1 uppercase tracking-wider">Condition</label>
              <select
                value={condition || ''}
                onChange={(e) => setParam('condition', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <option value="">Any condition</option>
                {LISTING_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-600 mb-1 uppercase tracking-wider">Min price (₦)</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={priceMin || ''}
                onChange={(e) => setParam('price_min', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-600 mb-1 uppercase tracking-wider">Max price (₦)</label>
              <input
                type="number"
                placeholder="e.g. 100000"
                value={priceMax || ''}
                onChange={(e) => setParam('price_max', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ListingCardSkeleton key={i} />)}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon="🔍"
            title="No listings found"
            description={hasFilters ? "Try adjusting your filters to see more results." : "No active listings yet. Check back soon!"}
            action={hasFilters ? (
              <button onClick={clearFilters} className="btn-primary px-4 py-2 rounded-lg bg-gold-500 font-semibold text-dark-900">
                Clear filters
              </button>
            ) : undefined}
          />
        ) : (
          <>
            <p className="text-sm text-dark-500 mb-3">
              {data.total} listing{data.total !== 1 ? 's' : ''} found
              {lga ? ` in ${lga}` : ''}{category ? ` – ${MATERIAL_CATEGORIES.find(c => c.value === category)?.label}` : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Pagination */}
            {(data.pages || 1) > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => setParam('page', String(page - 1))}
                  className="p-2 rounded-lg border border-cream-200 hover:bg-cream-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-dark-600 px-2">
                  Page {page} of {data.pages}
                </span>
                <button
                  disabled={page >= (data.pages || 1)}
                  onClick={() => setParam('page', String(page + 1))}
                  className="p-2 rounded-lg border border-cream-200 hover:bg-cream-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
