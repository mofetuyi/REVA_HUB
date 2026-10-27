import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, Eye, MousePointer } from 'lucide-react'
import { api } from '../../lib/api'
import { LoadingPage, EmptyState } from '../../components/ui/index'

export default function AdminAdsPage() {
  const { data: ads, isLoading } = useQuery({
    queryKey: ['adminAds'],
    queryFn: async () => {
      const res = await api.get('/admin/ads')
      return res.data
    },
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-dark-900">Ad Management (Reva Hub Learn Free Tier)</h1>
        <p className="text-xs text-dark-500 mt-1">Free-tier ad impressions on Reva Hub Learn. Reva Hub Premium accounts browse completely ad-free.</p>
      </div>

      {!ads || ads.length === 0 ? (
        <EmptyState
          icon="📢"
          title="No active ad campaigns"
          description="Direct ad campaigns will appear here. Reva Hub Learn displays non-intrusive sponsor cards to free users."
        />
      ) : (
        <div className="space-y-4">
          {ads.map((ad: any) => (
            <div
              key={ad.id}
              className="bg-white p-5 rounded-2xl border border-cream-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-bold text-sm text-dark-900">{ad.title}</h3>
                <p className="text-xs text-dark-500 mt-0.5">{ad.target_url}</p>
                <span className="inline-block mt-2 text-[10px] uppercase font-semibold px-2 py-0.5 bg-cream-100 rounded text-dark-700">
                  {ad.placement_type} · {ad.status}
                </span>
              </div>
              <div className="flex items-center gap-6 text-xs text-dark-600">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-dark-400" />
                  <span>{ad.impressions_count ?? 0} views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MousePointer className="w-4 h-4 text-dark-400" />
                  <span>{ad.clicks_count ?? 0} clicks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
