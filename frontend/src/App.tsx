/**
 * Reva App Router
 * All routes are defined here. Public routes use <Layout />, auth routes use
 * <AuthLayout />, admin routes use <AdminLayout />, and staff routes use
 * <StaffLayout />. Private routes are wrapped with <PrivateRoute />.
 */
import React, { Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { Layout, AuthLayout, AdminLayout } from './components/layout/Layout'
import { PrivateRoute, AdminRoute, StaffRoute } from './components/layout/RouteGuards'
import { LoadingPage } from './components/ui/index'

// ── Error Boundary ────────────────────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Reva Hub Render Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6 text-cream-50 font-sans">
          <div className="max-w-md w-full bg-dark-800 border border-gold-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mx-auto mb-4 text-gold-400 text-2xl font-bold">
              🌿
            </div>
            <h1 className="text-2xl font-display font-bold text-cream-50 mb-2">Reva Hub</h1>
            <p className="text-sm text-cream-300 mb-6">
              Something unexpected happened while rendering this page. Your session is safe.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false })
                  window.location.href = '/'
                }}
                className="bg-gold-500 hover:bg-gold-400 text-dark-900 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                Return to Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="border border-dark-600 hover:border-gold-500 text-cream-100 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
import SignupPage from './pages/auth/SignupPage'
import VerifyOTPPage from './pages/auth/VerifyOTPPage'
import LoginPage from './pages/auth/LoginPage'

// ── Marketplace ───────────────────────────────────────────────────────────────
import BrowsePage from './pages/marketplace/BrowsePage'
import ListingDetailPage from './pages/marketplace/ListingDetailPage'
import CreateListingPage from './pages/marketplace/CreateListingPage'
import EditListingPage from './pages/marketplace/EditListingPage'
import MyListingsPage from './pages/marketplace/MyListingsPage'
import OffersPage from './pages/marketplace/OffersPage'

// ── Orders ────────────────────────────────────────────────────────────────────
import OrdersPage from './pages/orders/OrdersPage'

// ── Profile ───────────────────────────────────────────────────────────────────
import ProfilePage from './pages/profile/ProfilePage'
import SettingsPage from './pages/profile/SettingsPage'
import KYCPage from './pages/profile/KYCPage'

// ── Learn ─────────────────────────────────────────────────────────────────────
import { LearnHomePage, TutorialBrowsePage, TutorialDetailPage } from './pages/learn/LearnPages'
import SkillPathsPage from './pages/learn/SkillPathsPage'
import SkillPathDetailPage from './pages/learn/SkillPathDetailPage'
import MyLearningPage from './pages/learn/MyLearningPage'

// ── AI ────────────────────────────────────────────────────────────────────────
import AIAssistantPage from './pages/ai/AIAssistantPage'

// ── Premium / Policy ──────────────────────────────────────────────────────────
const PremiumPage = lazy(() => import('./pages/premium/PremiumPage'))
const PolicyPage = lazy(() => import('./pages/policy/PolicyPage'))
const TermsPage = lazy(() => import('./pages/policy/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/policy/PrivacyPage'))

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminListingsPage = lazy(() => import('./pages/admin/AdminListingsPage'))
const AdminDisputesPage = lazy(() => import('./pages/admin/AdminDisputesPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AdminLearnPage = lazy(() => import('./pages/admin/AdminLearnPage'))
const AdminAdsPage = lazy(() => import('./pages/admin/AdminAdsPage'))
const AdminPriceRefsPage = lazy(() => import('./pages/admin/AdminPriceRefsPage'))
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'))

// ── Staff ─────────────────────────────────────────────────────────────────────
const StaffLoginPage = lazy(() => import('./pages/staff/StaffLoginPage'))
const StaffDashboardPage = lazy(() => import('./pages/staff/StaffDashboardPage'))

const SuspenseFallback = <LoadingPage />

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={SuspenseFallback}>
        <Routes>
        {/* ── Public layout ─────────────────────────────────────────────────── */}
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="listings" element={<BrowsePage />} />
          <Route path="listings/:id" element={<ListingDetailPage />} />
          <Route path="profile/:id" element={<ProfilePage />} />

          {/* Learn – public */}
          <Route path="learn" element={<LearnHomePage />} />
          <Route path="learn/tutorials" element={<TutorialBrowsePage />} />
          <Route path="learn/tutorials/:slug" element={<TutorialDetailPage />} />
          <Route path="learn/paths" element={<SkillPathsPage />} />
          <Route path="learn/paths/:id" element={<SkillPathDetailPage />} />

          {/* Policy pages – public */}
          <Route path="premium" element={<PremiumPage />} />
          <Route path="policy" element={<PolicyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />

          {/* Private routes inside main layout */}
          <Route path="listings/create" element={<PrivateRoute><CreateListingPage /></PrivateRoute>} />
          <Route path="listings/:id/edit" element={<PrivateRoute><EditListingPage /></PrivateRoute>} />
          <Route path="my-listings" element={<PrivateRoute><MyListingsPage /></PrivateRoute>} />
          <Route path="offers" element={<PrivateRoute><OffersPage /></PrivateRoute>} />
          <Route path="orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
          <Route path="settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="kyc" element={<PrivateRoute><KYCPage /></PrivateRoute>} />
          <Route path="learn/my-learning" element={<PrivateRoute><MyLearningPage /></PrivateRoute>} />
          <Route path="ai" element={<PrivateRoute><AIAssistantPage /></PrivateRoute>} />
        </Route>

        {/* ── Auth layout ───────────────────────────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="verify-otp" element={<VerifyOTPPage />} />
        </Route>

        {/* ── Admin layout ──────────────────────────────────────────────────── */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="admin/listings" element={<AdminListingsPage />} />
          <Route path="admin/disputes" element={<AdminDisputesPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/learn" element={<AdminLearnPage />} />
          <Route path="admin/ads" element={<AdminAdsPage />} />
          <Route path="admin/price-refs" element={<AdminPriceRefsPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
        </Route>

        {/* ── Staff layout ──────────────────────────────────────────────────── */}
        {/* Staff login is deliberately separate from customer nav */}
        <Route path="staff/login" element={<AuthLayout><StaffLoginPage /></AuthLayout>} />
        <Route element={<StaffRoute><AdminLayout /></StaffRoute>}>
          <Route path="staff/dashboard" element={<StaffDashboardPage />} />
        </Route>

        {/* ── Fallback ──────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </ErrorBoundary>
  )
}

// ── Inline landing page ────────────────────────────────────────────────────────
function HomePage() {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero */}
      <section className="text-center py-16 md:py-24 space-y-6">
        <div className="inline-flex items-center gap-2 bg-gold-100 text-gold-700 px-4 py-1.5 rounded-full text-sm font-medium mb-2">
          <span>🌿</span> Lagos, Nigeria
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-dark-900 leading-tight">
          Turn Waste Into&nbsp;
          <span className="text-gold-600">Value</span>
        </h1>
        <p className="text-lg md:text-xl text-dark-600 max-w-2xl mx-auto">
          Reva Hub connects households and businesses that have reusable materials
          with artisans, recyclers, and manufacturers who can transform them.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/listings"
            className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-600 text-dark-900 font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Browse Materials
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 border-2 border-dark-900 text-dark-900 hover:bg-dark-900 hover:text-cream-50 font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Start Selling
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: '♻️',
            title: 'Raw Materials Hub',
            desc: 'List and discover plastics, fabric, wood, cardboard, and other reusable materials. Arrange collection directly.',
            link: '/listings',
            cta: 'Browse Listings',
          },
          {
            icon: '📚',
            title: 'Reva Hub Learn',
            desc: 'Tutorials and skill paths that show you how to turn recovered materials into useful, sellable products.',
            link: '/learn',
            cta: 'Explore Tutorials',
          },
          {
            icon: '✅',
            title: 'Verified Sellers',
            desc: 'KYC-verified sellers with strong track records earn a Verified badge. Trade with confidence.',
            link: '/listings',
            cta: 'Find Verified Sellers',
          },
        ].map(card => (
          <div key={card.title} className="bg-white rounded-2xl p-6 shadow-sm border border-cream-200 flex flex-col gap-3">
            <span className="text-3xl">{card.icon}</span>
            <h2 className="font-display font-bold text-xl text-dark-900">{card.title}</h2>
            <p className="text-dark-600 text-sm flex-1">{card.desc}</p>
            <Link
              to={card.link}
              className="text-gold-600 hover:text-gold-700 font-semibold text-sm mt-1"
            >
              {card.cta} →
            </Link>
          </div>
        ))}
      </section>

      {/* Disclaimer */}
      <p className="text-center text-xs text-dark-400">
        Lagos, Nigeria only · Raw and reusable materials only · Not a general e-commerce marketplace
      </p>
    </div>
  )
}
