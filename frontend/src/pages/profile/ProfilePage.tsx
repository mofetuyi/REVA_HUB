import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { User, MapPin, Calendar, Star, Package, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { LoadingPage, EmptyState, VerifiedSellerBadge, PriceDisplay } from '../../components/ui/index'
import { ReportButton } from '../../components/ui/ReportButton'

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', id],
    queryFn: async () => {
      const res = await api.get(`/users/${id}/profile`)
      return res.data
    },
  })

  const { data: listings } = useQuery({
    queryKey: ['userListings', id],
    queryFn: async () => {
      const res = await api.get(`/users/${id}/listings?status=active`)
      return res.data
    },
  })

  if (isLoading) return <LoadingPage />
  if (!profile) return <EmptyState icon="👤" title="User not found" description="This profile does not exist or has been removed." />

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-3xl border border-cream-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold-100 text-gold-700 flex items-center justify-center font-display font-bold text-2xl">
            {profile.name?.charAt(0) || 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-dark-900">{profile.name}</h1>
              {profile.is_verified_seller && <VerifiedSellerBadge />}
            </div>
            <p className="text-xs text-dark-500 flex items-center gap-3">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.lga}, Lagos</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Member since {new Date(profile.created_at).getFullYear()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-bold text-dark-900">
              <Star className="w-4 h-4 fill-gold-400 text-gold-400" />
              <span>{Number(profile.average_rating || 0).toFixed(1)}</span>
              <span className="text-dark-400 font-normal text-xs">({profile.review_count || 0} reviews)</span>
            </div>
            <p className="text-[11px] text-dark-500 mt-0.5">{profile.completed_orders_count || 0} completed orders</p>
          </div>
          <ReportButton targetType="user" targetId={profile.id} buttonText="Report Profile" />
        </div>
      </div>

      {/* Active Listings from this user */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-dark-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-gold-600" />
          Active Listings by {profile.name}
        </h2>

        {!listings || listings.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No active listings"
            description="This user currently has no active material listings available."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map((item: any) => (
              <Link
                key={item.id}
                to={`/listings/${item.id}`}
                className="bg-white p-4 rounded-2xl border border-cream-200 hover:border-gold-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-cream-100 text-dark-700">
                    {item.category}
                  </span>
                  <h3 className="font-display font-bold text-sm text-dark-900 mt-1 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-dark-600 line-clamp-2 mt-1">{item.description}</p>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-cream-100">
                  <span className="font-bold text-dark-900">
                    <PriceDisplay amount={Number(item.price_ngn)} />
                  </span>
                  <span className="text-dark-500">{item.quantity} {item.unit}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
