import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Edit2, RotateCw, Trash2, Eye, Calendar, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { StatusBadge, PriceDisplay, LoadingPage, EmptyState } from '../../components/ui/index'

export default function MyListingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired'>('all')

  const { data: listings, isLoading } = useQuery({
    queryKey: ['myListings', activeTab],
    queryFn: async () => {
      const res = await api.get('/listings/my', {
        params: { status: activeTab !== 'all' ? activeTab : undefined },
      })
      return res.data
    },
  })

  const delistMutation = useMutation({
    mutationFn: (id: string) => api.post(`/listings/${id}/delist`),
    onSuccess: () => {
      toast.success('Listing delisted successfully')
      queryClient.invalidateQueries({ queryKey: ['myListings'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  const renewMutation = useMutation({
    mutationFn: (id: string) => api.post(`/listings/${id}/renew`),
    onSuccess: () => {
      toast.success('Listing renewed for 90 days!')
      queryClient.invalidateQueries({ queryKey: ['myListings'] })
    },
    onError: (err) => toast.error(extractError(err)),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900">My Material Listings</h1>
          <p className="text-xs text-dark-500 mt-1">Manage, renew, and edit your recovered materials listed on Reva Hub.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/listings/create">
            <Button>
              <Plus className="w-4 h-4 mr-1" /> Post New Listing
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-cream-200 pb-2 text-xs font-semibold">
        {(['all', 'active', 'expired'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-dark-900 text-cream-50'
                : 'text-dark-600 hover:bg-cream-100'
            }`}
          >
            {tab} Listings
          </button>
        ))}
      </div>

      {!listings || listings.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No listings found"
          description={
            activeTab === 'all'
              ? "You haven't listed any recovered materials yet."
              : `You have no ${activeTab} listings.`
          }
          action={
            <Link to="/listings/create">
              <Button>Post Material</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((item: any) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-cream-200 hover:border-gold-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-cream-100 text-dark-700">
                    {item.category}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <h2 className="font-display font-bold text-base text-dark-900 line-clamp-1">
                  {item.title}
                </h2>
                <p className="text-xs text-dark-600 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-dark-900 text-sm">
                    <PriceDisplay amount={Number(item.price_ngn)} />
                  </span>
                  <span className="text-dark-500">
                    {item.quantity} {item.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-cream-100 text-xs">
                <span className="text-dark-400 flex items-center gap-1 text-[11px]">
                  <Eye className="w-3.5 h-3.5" /> {item.view_count || 0} views
                </span>

                <div className="flex items-center gap-2">
                  {item.status === 'expired' && (
                    <Button
                      size="sm"
                      onClick={() => renewMutation.mutate(item.id)}
                      isLoading={renewMutation.isPending}
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1" /> Renew
                    </Button>
                  )}
                  {item.status === 'active' && (
                    <>
                      <Link to={`/listings/${item.id}/edit`}>
                        <Button size="sm" variant="secondary">
                          <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm('Are you sure you want to delist this material?')) {
                            delistMutation.mutate(item.id)
                          }
                        }}
                      >
                        Delist
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
