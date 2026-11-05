import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

const GOOGLE_CLIENT_ID = '297315865729-9qo3gsakcsumqgm2figktk8srsgdv24a.apps.googleusercontent.com'

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup'
  redirectTo?: string
}

export function GoogleAuthButton({ mode = 'signin', redirectTo = '/' }: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  useEffect(() => {
    // 1. Ensure official Google Identity Services library is loaded
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    const handleGoogleResponse = async (response: any) => {
      const userToken = response.credential
      console.log('Official Google ID Token received:', userToken)

      if (typeof (window as any).handleCredentialResponse === 'function') {
        try {
          (window as any).handleCredentialResponse(response)
        } catch {}
      }

      try {
        const res = await api.post('/auth/google', { idToken: userToken, credential: userToken })
        if (res.data?.success || res.data?.access_token) {
          login(
            { access_token: res.data.access_token, refresh_token: res.data.refresh_token },
            res.data.user
          )
          toast.success(`Welcome, ${res.data.user?.name || 'User'}! Logged in with Google 🎉`)
          navigate(redirectTo, { replace: true })
        } else {
          toast.error(res.data?.message || 'Google sign-in failed')
        }
      } catch (err: any) {
        toast.error(err.response?.data?.detail || 'Google authentication failed')
      }
    }

    ;(window as any).handleCredentialResponse = handleGoogleResponse

    // 2. Render Google's official Sign In button
    const initGsi = () => {
      const google = (window as any).google
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        })
        if (buttonRef.current) {
          buttonRef.current.innerHTML = ''
          google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: mode === 'signup' ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 360,
          })
        }
      }
    }

    if ((window as any).google?.accounts?.id) {
      initGsi()
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval)
          initGsi()
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [login, mode, navigate, redirectTo])

  return (
    <div className="w-full flex flex-col items-center justify-center my-3">
      {/* Declarative GIS container */}
      <div
        id="g_id_onload"
        data-client_id={GOOGLE_CLIENT_ID}
        data-callback="handleCredentialResponse"
      />
      {/* Official Google Button rendered into container */}
      <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]" />
    </div>
  )
}
