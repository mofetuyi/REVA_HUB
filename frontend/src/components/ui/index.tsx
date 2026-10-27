import React from 'react'
import { clsx } from 'clsx'
import { Star } from 'lucide-react'

interface RatingStarsProps {
  rating: number
  maxRating?: number
  readonly?: boolean
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function RatingStars({
  rating,
  maxRating = 5,
  readonly = true,
  onChange,
  size = 'md',
  label,
}: RatingStarsProps) {
  const [hovered, setHovered] = React.useState(0)
  const sizes = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-7 h-7' }

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={readonly ? 'img' : 'group'}
      aria-label={label || `Rating: ${rating} out of ${maxRating}`}
    >
      {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          aria-label={readonly ? undefined : `Rate ${star} out of ${maxRating}`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={clsx(
            'transition-colors',
            !readonly && 'cursor-pointer hover:scale-110',
            readonly && 'cursor-default',
          )}
        >
          <Star
            className={clsx(
              sizes[size],
              (hovered ? star <= hovered : star <= rating)
                ? 'fill-gold-500 text-gold-500'
                : 'fill-none text-cream-200',
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function PriceDisplay({ amount, className }: { amount: number; className?: string }) {
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  return (
    <span className={clsx('font-semibold', className)} aria-label={`Price: ${formatted}`}>
      {formatted}
    </span>
  )
}

export function VerifiedSellerBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        'bg-gold-500 text-dark-900',
        className,
      )}
      title="Verified Seller – KYC verified, 5+ orders, 4.0+ rating, no recent disputes"
      aria-label="Verified Seller badge"
    >
      ✓ Verified Seller
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    funded: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-purple-100 text-purple-800',
    confirmed: 'bg-teal-100 text-teal-800',
    completed: 'bg-green-200 text-green-900',
    disputed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-700',
    refunded: 'bg-orange-100 text-orange-800',
    pending: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-gray-100 text-gray-600',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    countered: 'bg-purple-100 text-purple-800',
    created: 'bg-gray-100 text-gray-700',
    payment_pending: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        styles[status] || 'bg-gray-100 text-gray-700',
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="text-6xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-xl font-semibold text-dark-800 mb-2">{title}</h3>
      <p className="text-dark-600 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-cream-200 border-t-gold-500',
        className || 'w-8 h-8',
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner className="w-12 h-12" />
    </div>
  )
}

export function DevSampleBanner() {
  if (import.meta.env.VITE_ENVIRONMENT !== 'development') return null
  return (
    <div
      className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 flex items-center gap-2"
      role="note"
    >
      ⚠️ <strong>Sample content – development mode only.</strong> Not real inventory.
    </div>
  )
}
