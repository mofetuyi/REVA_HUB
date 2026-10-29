import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Calendar, Star, Package, Settings, ShieldCheck, CheckCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { LoadingPage, EmptyState, VerifiedSellerBadge, PriceDisplay } from '../../components/ui/index'
import { ReportButton } from '../../components/ui/ReportButton'

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser } = useAuthStore()

  const targetId = id || currentUser?.id || 'me'
  const isOwnProfile = currentUser?.id && (targetId === currentUser.id || targetId === 'me')

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['userProfile', targetId],
    queryFn: async () => {
      try {
        const res = await api.get(`/users/${targetId}/profile`)
        // If response is HTML or not an object, fall back to current user if own profile
        if (typeof res.data !== 'object' || res.data === null || typeof res.data === 'string') {
          if (isOwnProfile && currentUser) {
            return {
              id: currentUser.id,
              name: currentUser.name,
              lga: currentUser.lga || 'Lagos',
              is_verified_seller: currentUser.is_seller,
              is_premium: currentUser.is_premium,
              created_at: new Date().toISOString(),
              average_rating: 5.0,
              review_count: 0,
              completed_orders_count: 0,
            }
          }
          return null
        }
        return res.data
      } catch (err) {
        if (isOwnProfile && currentUser) {
          return {
            id: currentUser.id,
            name: currentUser.name,
            lga: currentUser.lga || 'Lagos',
            is_verified_seller: currentUser.is_seller,
            is_premium: currentUser.is_premium,
            created_at: new Date().toISOString(),
            average_rating: 5.0,
            review_count: 0,
            completed_orders_count: 0,
          }
        }
        return null
      }
    },
  })

  const { data: listings } = useQuery({
    queryKey: ['userListings', targetId],
    queryFn: async () => {
      try {
        const res = await api.get(`/users/${targetId}/listings?status=active`)
        return Array.isArray(res.data) ? res.data : []
      } catch {
        return []
      }
    },
  })

  if (isLoading) return <LoadingPage />

  if (isError || !profile) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <EmptyState
          icon="👤"
          title="User profile not found"
          description="This profile could not be loaded or may have been updated."
          action={
            <Link
              to="/listings"
              className="px-4 py-2 bg-[#062E12] text-white rounded-xl text-xs font-bold hover:bg-[#08421a] transition-colors"
            >
              Return to Marketplace
            </Link>
          }
        />
      </div>
    )
  }

  const memberYear = profile.created_at ? new Date(profile.created_at).getFullYear() : 2026
  const activeListings = Array.isArray(listings) ? listings : []

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4 sm:px-0">
      {/* Profile Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cream-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#062E12] text-white flex items-center justify-center font-display font-bold text-2xl shadow-sm border border-gold-400">
            {profile.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-dark-900">{profile.name}</h1>
              {profile.is_verified_seller && <VerifiedSellerBadge />}
              {profile.is_premium && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-100 text-gold-800 border border-gold-300">
                  ★ Premium
                </span>
              )}
            </div>
            <p className="text-xs text-dark-500 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gold-600" /> {profile.lga || 'Lagos'}, Nigeria
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gold-600" /> Member since {isNaN(memberYear) ? 2026 : memberYear}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:flex-col sm:items-end w-full sm:w-auto justify-between">
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-1 text-sm font-bold text-dark-900">
              <Star className="w-4 h-4 fill-gold-400 text-gold-400" />
              <span>{Number(profile.average_rating || 5.0).toFixed(1)}</span>
              <span className="text-dark-400 font-normal text-xs">({profile.review_count || 0} reviews)</span>
            </div>
            <p className="text-[11px] text-dark-500 mt-0.5">{profile.completed_orders_count || 0} completed orders</p>
          </div>

          {isOwnProfile ? (
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-cream-100 text-dark-800 hover:bg-cream-200 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Account Settings
            </Link>
          ) : (
            <ReportButton targetType="user" targetId={profile.id} buttonText="Report Profile" />
          )}
        </div>
      </div>

      {/* Active Listings from this user */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-dark-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-gold-600" />
            Active Listings by {profile.name}
          </h2>
          <span className="text-xs text-dark-500 font-medium">
            {activeListings.length} {activeListings.length === 1 ? 'item' : 'items'} available
          </span>
        </div>

        {activeListings.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No active listings"
            description="This user currently has no active material listings available."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activeListings.map((item: any) => (
              <Link
                key={item.id}
                to={`/listings/${item.id}`}
                className="bg-white p-4 rounded-2xl border border-cream-200 hover:border-gold-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#062E12]/10 text-[#062E12]">
                    {item.category}
                  </span>
                  <h3 className="font-display font-bold text-sm text-dark-900 mt-1 line-clamp-1 group-hover:text-[#062E12]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-dark-600 line-clamp-2 mt-1">{item.description}</p>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-cream-100">
                  <span className="font-bold text-dark-900">
                    <PriceDisplay amount={Number(item.price_ngn)} />
                  </span>
                  <span className="text-dark-500 font-medium">{item.quantity} {item.unit}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
