import React, { useState } from 'react'
import { clsx } from 'clsx'

// ── Reva Official Logo (Leaf + Circular Arrow in Rich Gold) ──────────────────

export function RevaLogoIcon({ className, useImage = true }: { className?: string; useImage?: boolean }) {
  const [imgError, setImgError] = useState(false)

  if (useImage && !imgError) {
    return (
      <img
        src="/logo.jpg"
        alt="Reva Hub Logo"
        className={clsx('w-10 h-10 object-contain rounded-full bg-dark-900 border border-gold-500/40 shadow-sm shrink-0', className)}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('w-10 h-10 shrink-0', className)}
      aria-label="Reva Hub logo"
      role="img"
    >
      {/* Background container ring */}
      <circle cx="40" cy="40" r="38" fill="#0F0F0F" />
      {/* Upper Leaf */}
      <path
        d="M20 54C16 38 25 18 56 6C44 22 46 34 50 36C40 34 26 42 20 54Z"
        fill="url(#goldGrad)"
      />
      {/* Leaf lower curve */}
      <path
        d="M14 46C18 30 30 18 48 14C32 26 24 38 22 50C16 48 14 47 14 46Z"
        fill="url(#goldGrad)"
        opacity="0.85"
      />
      {/* Outer top-right arc */}
      <path
        d="M60 22C68 28 72 37 72 48"
        stroke="url(#goldGrad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Lower swirl arrow */}
      <path
        d="M18 50C22 66 38 74 54 70C62 67 68 60 70 52"
        stroke="url(#goldGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <polygon
        points="70,44 60,56 74,58"
        fill="url(#goldGrad)"
      />
      <defs>
        <linearGradient id="goldGrad" x1="10" y1="10" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5D77F" />
          <stop offset="0.5" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#997A15" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function RevaWordmark({ className }: { className?: string }) {
  return (
    <span
      className={clsx('font-display font-bold tracking-wide text-dark-900', className)}
      style={{ letterSpacing: '0.03em' }}
    >
      Reva <span className="text-gold-600 font-semibold">Hub</span>
    </span>
  )
}

export function RevaLogo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
  const iconSizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' }
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <RevaLogoIcon className={iconSizes[size]} />
      <RevaWordmark className={sizes[size]} />
    </div>
  )
}
