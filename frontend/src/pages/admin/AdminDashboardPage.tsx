import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, AlertCircle, Users, BookOpen, DollarSign, Flag, ShieldCheck } from 'lucide-react'
import { api } from '../../lib/api'
import { LoadingPage } from '../../components/ui/index'

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats')
      return res.data
    },
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark-900">Admin Overview</h1>
        <p className="text-xs text-dark-500 mt-1">Platform moderation, dispute operations, and compliance telemetry.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Listings', value: stats?.pending_listings_count ?? 0, icon: Package, link: '/admin/listings' },
          { label: 'Open Disputes', value: stats?.open_disputes_count ?? 0, icon: AlertCircle, link: '/admin/disputes' },
          { label: 'Total Users', value: stats?.users_count ?? 0, icon: Users, link: '/admin/users' },
          { label: 'Verified Sellers', value: stats?.verified_sellers_count ?? 0, icon: ShieldCheck, link: '/admin/users' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              to={s.link}
              className="p-5 bg-white rounded-2xl border border-cream-200 hover:border-gold-400 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-dark-500">{s.label}</span>
                <Icon className="w-4 h-4 text-gold-600" />
              </div>
              <p className="text-2xl font-display font-bold text-dark-900 mt-3">{s.value}</p>
            </Link>
          )
        })}
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="font-display font-bold text-base text-dark-900">Marketplace Moderation</h2>
          <p className="text-xs text-dark-600">Review flagged material listings, inspect AI assessment reports, and approve or reject submissions.</p>
          <div className="pt-2">
            <Link to="/admin/listings" className="text-xs font-semibold text-gold-600 hover:underline">
              Open Listing Queue →
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="font-display font-bold text-base text-dark-900">Price Benchmark Ranges</h2>
          <p className="text-xs text-dark-600">Manage real market reference price ranges per material/unit used for automated AI listing price checks.</p>
          <div className="pt-2">
            <Link to="/admin/price-refs" className="text-xs font-semibold text-gold-600 hover:underline">
              Manage Price Ranges →
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="font-display font-bold text-base text-dark-900">Trust & Safety Reports</h2>
          <p className="text-xs text-dark-600">Investigate user reports, handle enforcement actions, review appeals, and enforce acceptable use policies.</p>
          <div className="pt-2">
            <Link to="/admin/reports" className="text-xs font-semibold text-gold-600 hover:underline">
              Inspect Reports Queue →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
