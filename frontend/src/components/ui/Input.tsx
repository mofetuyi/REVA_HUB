import React, { forwardRef } from 'react'
import { clsx } from 'clsx'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  helperText?: string
  phonePrefix?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  helperText,
  phonePrefix = false,
  className,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false)
  const isPassword = props.type === 'password'
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const activeHelper = helper || helperText

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-dark-800 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <div className="relative flex">
        {phonePrefix && (
          <span className="flex items-center px-3 bg-cream-100 border border-r-0 border-cream-200 rounded-l-lg text-dark-700 text-sm font-medium">
            +234
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : activeHelper ? `${inputId}-helper` : undefined}
          className={clsx(
            'w-full px-3 py-2 border border-cream-200 bg-white text-dark-900 placeholder:text-cream-200',
            'focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 transition-colors',
            phonePrefix ? 'rounded-r-lg rounded-l-none' : 'rounded-lg',
            isPassword && 'pr-10',
            error && 'border-red-400 focus:ring-red-400',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-600 hover:text-dark-900"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      {activeHelper && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-dark-600">
          {activeHelper}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
