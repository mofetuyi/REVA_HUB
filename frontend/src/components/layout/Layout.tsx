import React from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Header } from './Header'
import { Toaster } from 'react-hot-toast'
import { RevaLogoIcon } from '../ui/RevaLogo'
import { Lock } from 'lucide-react'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="bg-brandGreen-950 text-white pt-10 pb-6 mt-auto border-t border-gold-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-brandGreen-800">
            <div className="flex items-center gap-2.5">
              <RevaLogoIcon className="w-8 h-8" />
              <div>
                <span className="font-display font-bold text-gold-300 text-lg">Reva Hub</span>
                <p className="text-xs text-cream-200">Lagos circular economy marketplace & upcycling platform.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-cream-100">
              <Link to="/listings" className="hover:text-gold-300 transition-colors">Browse Materials</Link>
              <span className="text-gold-500/60">•</span>
              <Link to="/learn" className="hover:text-gold-300 transition-colors">Reva Hub Learn</Link>
              <span className="text-gold-500/60">•</span>
              <Link to="/premium" className="hover:text-gold-300 transition-colors">Premium</Link>
              <span className="text-gold-500/60">•</span>
              <Link to="/policy" className="hover:text-gold-300 transition-colors">Trust & Safety</Link>
              <span className="text-gold-500/60">•</span>
              <Link to="/terms" className="hover:text-gold-300 transition-colors">Terms</Link>
              <span className="text-gold-500/60">•</span>
              <Link to="/privacy" className="hover:text-gold-300 transition-colors">Privacy</Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cream-300">
            <p>© {new Date().getFullYear()} Reva Hub Nigeria. Lagos, Nigeria. The Circular Economy Standard.</p>

            {/* Discreet, hidden staff login in the bottom corner */}
            <div className="flex items-center gap-3">
              <Link
                to="/staff/login"
                className="text-cream-400 hover:text-gold-300 text-[11px] transition-colors inline-flex items-center gap-1 opacity-60 hover:opacity-100 cursor-pointer"
                title="Authorised Staff Access"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Staff Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1A1A1A', color: '#F5F0E8' },
          success: { iconTheme: { primary: '#C9A227', secondary: '#0F0F0F' } },
        }}
      />
    </div>
  )
}

export function AuthLayout({ children }: { children?: React.ReactNode } = {}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brandGreen-950 via-brandGreen-900 to-brandGreen-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <RevaLogoIcon className="w-12 h-12" />
            <span className="font-display font-bold text-gold-300 text-3xl">Reva Hub</span>
          </div>
        </Link>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gold-500/30">
          {children || <Outlet />}
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}

export function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <Header />
      <div className="flex-1 flex">
        <aside className="hidden md:flex flex-col w-56 bg-dark-900 text-cream-100 p-4 gap-1 pt-6">
          <p className="text-xs font-semibold text-dark-600 uppercase tracking-wider mb-2 px-3">Admin</p>
          {[
            { to: '/admin', label: 'Dashboard' },
            { to: '/admin/listings', label: 'Listing Queue' },
            { to: '/admin/disputes', label: 'Disputes' },
            { to: '/admin/users', label: 'Users' },
            { to: '/admin/learn', label: 'Learn Moderation' },
            { to: '/admin/ads', label: 'Ads' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="px-3 py-2 rounded-lg text-sm text-cream-100 hover:bg-dark-800 hover:text-gold-400 transition-colors"
            >
              {label}
            </Link>
          ))}
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
