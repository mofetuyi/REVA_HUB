import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, ShoppingCart, BookOpen, LayoutGrid, LogOut, Settings, User, ChevronDown, Menu, X, Briefcase, Crown } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { api } from '../../lib/api'
import { RevaLogo } from '../ui/RevaLogo'
import { Button } from '../ui/Button'

export function Header() {
  const { user, isAuthenticated, logout, mode, switchMode } = useAuthStore()
  const cartItemCount = useCartStore((s) => s.getItemCount())
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      logout()
      navigate('/')
      toast.success('Logged out')
    },
  })

  const switchModeMutation = useMutation({
    mutationFn: (newMode: 'buyer' | 'seller') =>
      api.post('/auth/switch-mode', { mode: newMode }),
    onSuccess: (_data, newMode) => {
      switchMode(newMode)
      toast.success(`Switched to ${newMode} mode`)
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Could not switch mode'),
  })

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gold-500/20 shadow-sm">
      {/* Signature Top Banner: Dark Green, Crisp White & Rich Gold */}
      <div className="bg-brandGreen-950 text-white py-1.5 px-4 text-xs border-b border-gold-500/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
            <span className="font-medium text-white tracking-wide">
              Lagos Circular Economy Marketplace: <span className="text-gold-300 font-semibold">Recovered Plastics, Wood, Fabric & Circular Goods</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-white/85 text-[11px]">
            <span className="text-gold-300 font-medium">✓ Paystack Escrow Protected</span>
            <span className="text-gold-500/50">•</span>
            <span className="text-white">100% Verified Lagos Suppliers</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" aria-label="Reva Hub home">
            <RevaLogo size="sm" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <Link to="/" className="px-3 py-2 text-sm font-semibold text-dark-800 hover:text-brandGreen-900 hover:bg-brandGreen-50 rounded-lg transition-colors">
              Browse
            </Link>
            <Link to="/learn" className="px-3 py-2 text-sm font-semibold text-dark-800 hover:text-brandGreen-900 hover:bg-brandGreen-50 rounded-lg transition-colors">
              Learn
            </Link>
            <Link to="/premium" className="px-3 py-2 text-sm font-bold text-gold-600 hover:text-gold-700 hover:bg-gold-50 rounded-lg transition-colors inline-flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-gold-500" /> Premium
            </Link>
            {isAuthenticated && mode === 'seller' && (
              <Link to="/my-listings" className="px-3 py-2 text-sm font-semibold text-dark-800 hover:text-brandGreen-900 hover:bg-brandGreen-50 rounded-lg transition-colors">
                My Listings
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/orders" className="px-3 py-2 text-sm font-semibold text-dark-800 hover:text-brandGreen-900 hover:bg-brandGreen-50 rounded-lg transition-colors">
                Orders
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/offers" className="px-3 py-2 text-sm font-semibold text-dark-800 hover:text-brandGreen-900 hover:bg-brandGreen-50 rounded-lg transition-colors">
                Offers
              </Link>
            )}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Cart Icon Button */}
            <Link
              to="/cart"
              className="relative p-2 text-dark-800 hover:text-[#062E12] hover:bg-cream-100 rounded-full transition-colors"
              title="View Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#062E12] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {cartItemCount}
                </span>
              )}
            </Link>
            {/* Mode toggle */}
            {isAuthenticated && user && (
              <button
                onClick={() => switchModeMutation.mutate(mode === 'buyer' ? 'seller' : 'buyer')}
                disabled={switchModeMutation.isPending}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                style={{
                  background: mode === 'seller' ? '#C9A227' : '#F5F0E8',
                  borderColor: mode === 'seller' ? '#A07818' : '#E8E0CC',
                  color: mode === 'seller' ? '#0F0F0F' : '#2A2A2A',
                }}
                aria-label={`Currently in ${mode} mode. Click to switch.`}
              >
                {mode === 'seller' ? <Briefcase className="w-3 h-3" /> : <ShoppingBag className="w-3 h-3" />}
                {mode === 'seller' ? 'Selling' : 'Buying'}
              </button>
            )}

            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-cream-50 transition-colors"
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-dark-900 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className="w-4 h-4 text-dark-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-cream-100 py-1 z-20 animate-fade-in">
                      <Link to={`/profile/${user.id}`} className="flex items-center gap-2 px-4 py-2 text-sm text-dark-800 hover:bg-cream-50" onClick={() => setUserMenuOpen(false)}>
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-dark-800 hover:bg-cream-50" onClick={() => setUserMenuOpen(false)}>
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      {user.is_admin && (
                        <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-dark-800 hover:bg-cream-50" onClick={() => setUserMenuOpen(false)}>
                          <LayoutGrid className="w-4 h-4" /> Admin
                        </Link>
                      )}
                      <hr className="my-1 border-cream-100" />
                      <button
                        onClick={() => { logoutMutation.mutate(); setUserMenuOpen(false) }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" /> Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">Log in</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-dark-700 hover:bg-cream-50"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-cream-100 px-4 py-3 space-y-1 animate-slide-up">
          <Link to="/" className="block px-3 py-2 text-sm font-medium text-dark-700 hover:bg-cream-50 rounded-lg" onClick={() => setMenuOpen(false)}>Browse</Link>
          <Link to="/cart" className="block px-3 py-2 text-sm font-semibold text-[#062E12] hover:bg-cream-50 rounded-lg flex items-center justify-between" onClick={() => setMenuOpen(false)}>
            <span className="flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Shopping Cart</span>
            {cartItemCount > 0 && <span className="px-2 py-0.5 bg-[#062E12] text-white text-xs font-bold rounded-full">{cartItemCount}</span>}
          </Link>
          <Link to="/learn" className="block px-3 py-2 text-sm font-medium text-dark-700 hover:bg-cream-50 rounded-lg" onClick={() => setMenuOpen(false)}>Learn</Link>
          <Link to="/premium" className="block px-3 py-2 text-sm font-semibold text-gold-600 hover:bg-gold-50 rounded-lg flex items-center gap-1.5" onClick={() => setMenuOpen(false)}>
            <Crown className="w-4 h-4 text-gold-500" /> Reva Hub Premium
          </Link>
          {isAuthenticated && <Link to="/orders" className="block px-3 py-2 text-sm font-medium text-dark-700 hover:bg-cream-50 rounded-lg" onClick={() => setMenuOpen(false)}>Orders</Link>}
          {isAuthenticated && <Link to="/offers" className="block px-3 py-2 text-sm font-medium text-dark-700 hover:bg-cream-50 rounded-lg" onClick={() => setMenuOpen(false)}>Offers</Link>}
          {isAuthenticated && mode === 'seller' && <Link to="/my-listings" className="block px-3 py-2 text-sm font-medium text-dark-700 hover:bg-cream-50 rounded-lg" onClick={() => setMenuOpen(false)}>My Listings</Link>}
          {isAuthenticated && (
            <button
              onClick={() => { switchModeMutation.mutate(mode === 'buyer' ? 'seller' : 'buyer'); setMenuOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm font-medium text-gold-600 hover:bg-gold-50 rounded-lg"
            >
              Switch to {mode === 'buyer' ? 'Seller' : 'Buyer'} mode
            </button>
          )}
        </div>
      )}
    </header>
  )
}
