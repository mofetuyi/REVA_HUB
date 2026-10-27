import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingPage } from '../ui/index'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function SellerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, mode } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (mode !== 'seller') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-5xl">🏪</div>
        <h2 className="text-2xl font-display font-bold">Seller Mode Required</h2>
        <p className="text-dark-600 max-w-sm">Switch to seller mode to access this page.</p>
        <button
          className="btn-primary px-6 py-2 rounded-lg bg-gold-500 font-semibold"
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    )
  }
  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-display font-bold">Access Denied</h2>
        <p className="text-dark-600">Admin access is required for this page.</p>
      </div>
    )
  }
  return <>{children}</>
}

/**
 * StaffRoute — requires is_staff OR is_admin.
 * The hidden URL is NOT a security control; access is enforced server-side
 * on every staff API endpoint.
 */
export function StaffRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/staff/login" state={{ from: location }} replace />
  if (!user?.is_staff && !user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-display font-bold">Staff Access Required</h2>
        <p className="text-dark-600">This area is restricted to authorised Reva Hub staff.</p>
      </div>
    )
  }
  return <>{children}</>
}
