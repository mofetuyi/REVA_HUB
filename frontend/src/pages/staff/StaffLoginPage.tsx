import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function StaffLoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formattedPhone = phone.startsWith('+234')
        ? phone
        : phone.startsWith('0')
        ? `+234${phone.slice(1)}`
        : `+234${phone}`

      const res = await api.post('/auth/login', {
        phone: formattedPhone,
        password,
      })

      // Fetch user profile to verify staff access server-side
      const userRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${res.data.access_token}` },
      })

      const user = userRes.data
      if (!user.is_staff && !user.is_admin) {
        toast.error('Access restricted to authorised staff accounts.')
        return
      }

      login(res.data, user)
      toast.success(`Welcome to Staff Portal, ${user.name}`)
      navigate('/staff/dashboard')
    } catch (err: any) {
      toast.error(extractError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-dark-800 text-gold-400 rounded-2xl mb-1">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl font-bold text-dark-900">Reva Hub Staff Access</h1>
        <p className="text-xs text-dark-500 max-w-xs mx-auto">
          Authorised personnel portal. Access is monitored and audited.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Staff Phone Number"
          type="tel"
          placeholder="e.g. 08012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          className="w-full bg-dark-900 text-gold-400 hover:bg-dark-800"
          isLoading={isLoading}
        >
          Sign In to Staff Portal
        </Button>
      </form>

      <div className="p-3 bg-cream-100 rounded-xl border border-cream-200 flex items-start gap-2 text-xs text-dark-600">
        <Lock className="w-4 h-4 text-dark-400 shrink-0 mt-0.5" />
        <p>
          First staff accounts are provisioned via the secure backend CLI. Public staff sign-up is disabled.
        </p>
      </div>
    </div>
  )
}
