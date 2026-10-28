import React from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  isLoading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isCurrentlyLoading = loading || isLoading
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

  const variants = {
    primary: 'bg-brandGreen-900 hover:bg-brandGreen-950 text-white border border-gold-500/40 shadow-sm font-semibold',
    secondary: 'bg-white hover:bg-brandGreen-50 text-brandGreen-900 border border-brandGreen-200 font-semibold shadow-sm',
    gold: 'bg-gold-500 hover:bg-gold-600 text-brandGreen-950 font-bold border border-gold-300 shadow-sm',
    ghost: 'text-dark-800 hover:text-brandGreen-800 hover:bg-brandGreen-50 font-medium',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-semibold',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || isCurrentlyLoading}
      {...props}
    >
      {isCurrentlyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
