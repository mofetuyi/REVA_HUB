import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { LAGOS_LGAS } from '../../lib/nigeriaData'
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton'

const step1Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Enter 10 digits after +234 (e.g. 8012345678)'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const step2Schema = z.object({
  lga: z.string().min(1, 'Please select your LGA'),
  account_type: z.enum(['individual', 'business']),
  business_name: z.string().optional(),
  agree_to_policy: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Reva Hub User Agreement to continue' }),
  }),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export default function SignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = React.useState(1)
  const [step1Data, setStep1Data] = React.useState<Step1Data | null>(null)

  const form1 = useForm<Step1Data>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2Data>({ resolver: zodResolver(step2Schema), defaultValues: { account_type: 'individual' } })

  const accountType = form2.watch('account_type')

  const signupMutation = useMutation({
    mutationFn: (data: Step1Data & Step2Data) => {
      const phone = `+234${data.phone.replace(/^0/, '')}`
      return api.post('/auth/signup', {
        phone,
        name: data.name,
        email: data.email || undefined,
        password: data.password,
        state: 'Lagos',
        lga: data.lga,
        account_type: data.account_type,
        business_name: data.account_type === 'business' ? data.business_name : undefined,
        agree_to_policy: true,
      })
    },
    onSuccess: (_res, data) => {
      toast.success('Account created! Check your phone for the OTP.')
      const phone = `+234${data.phone.replace(/^0/, '')}`
      navigate('/verify-otp', { state: { phone } })
    },
    onError: (err: any, data) => {
      const is404OrNetwork = err?.response?.status === 404 || err?.code === 'ERR_NETWORK' || !err?.response
      if (is404OrNetwork) {
        // Fallback demo account when backend server is offline or on static host
        const phone = `+234${data.phone.replace(/^0/, '')}`
        const demoUser = {
          id: 'usr_' + Date.now().toString(36),
          phone,
          name: data.name,
          email: data.email || undefined,
          account_type: data.account_type,
          business_name: data.business_name,
          lga: data.lga,
          state: 'Lagos',
          current_mode: 'buyer' as const,
          is_buyer: true,
          is_seller: false,
          is_admin: false,
          is_staff: false,
          is_premium: false,
          reva_id: `REVA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          kyc_status: 'not_started' as const,
          created_at: new Date().toISOString(),
        }
        useAuthStore.getState().login(
          { access_token: 'demo_token_' + Date.now(), refresh_token: 'demo_refresh' },
          demoUser
        )
        toast.success(`Welcome to Reva Hub, ${data.name}! (Signed in in Demo Mode)`)
        navigate('/')
        return
      }
      toast.error(extractError(err))
    },
  })

  const onStep1 = (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  }

  const onStep2 = (data: Step2Data) => {
    if (!step1Data) return
    if (data.account_type === 'business' && !data.business_name?.trim()) {
      form2.setError('business_name', { message: 'Business name is required' })
      return
    }
    signupMutation.mutate({ ...step1Data, ...data })
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-display font-bold text-dark-900">Create your account</h1>
        <p className="text-dark-600 mt-1 text-sm">Join Reva Hub – Lagos's recovered materials marketplace</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step >= s ? 'bg-gold-500 text-dark-900' : 'bg-cream-100 text-dark-500'}`}>
              {s}
            </div>
            {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-gold-500' : 'bg-cream-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── 1-Click Google Sign Up (Pre-verified) ── */}
      {step === 1 && (
        <div className="space-y-4 mb-5">
          <GoogleAuthButton mode="signup" redirectTo="/" />

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cream-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#FAF8F5] px-3 text-dark-400 font-medium">or register with phone</span>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
          <Input
            label="Full name"
            placeholder="e.g. Amara Okafor"
            required
            {...form1.register('name')}
            error={form1.formState.errors.name?.message}
          />
          <div>
            <label className="block text-sm font-medium text-dark-800 mb-1">
              Phone number <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <span className="flex items-center px-3 bg-cream-100 border border-r-0 border-cream-200 rounded-l-lg text-dark-700 text-sm font-medium whitespace-nowrap">+234</span>
              <input
                type="tel"
                placeholder="8012345678"
                maxLength={10}
                className="flex-1 px-3 py-2 border border-cream-200 bg-white text-dark-900 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400"
                {...form1.register('phone')}
              />
            </div>
            {form1.formState.errors.phone && (
              <p className="mt-1 text-sm text-red-600">{form1.formState.errors.phone.message}</p>
            )}
            <p className="text-xs text-dark-500 mt-1">We'll send a verification code to this number</p>
          </div>
          <Input
            label="Email (optional)"
            type="email"
            placeholder="you@example.com"
            {...form1.register('email')}
            error={form1.formState.errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="Minimum 8 characters"
            {...form1.register('password')}
            error={form1.formState.errors.password?.message}
          />
          <Input
            label="Confirm password"
            type="password"
            required
            {...form1.register('confirmPassword')}
            error={form1.formState.errors.confirmPassword?.message}
          />
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-800 mb-1">Lagos LGA <span className="text-red-500">*</span></label>
            <select
              className="w-full px-3 py-2 border border-cream-200 rounded-lg bg-white text-dark-900 focus:outline-none focus:ring-2 focus:ring-gold-400"
              {...form2.register('lga')}
            >
              <option value="">Select your LGA</option>
              {LAGOS_LGAS.map(lga => <option key={lga} value={lga}>{lga}</option>)}
            </select>
            {form2.formState.errors.lga && <p className="text-sm text-red-600 mt-1">{form2.formState.errors.lga.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-800 mb-2">Account type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(['individual', 'business'] as const).map((type) => (
                <label
                  key={type}
                  className={`relative flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-colors ${accountType === type ? 'border-gold-500 bg-gold-50' : 'border-cream-200 hover:border-gold-300'}`}
                >
                  <input type="radio" value={type} className="sr-only" {...form2.register('account_type')} />
                  <span className="text-2xl mb-1">{type === 'individual' ? '👤' : '🏢'}</span>
                  <span className="text-sm font-semibold capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {accountType === 'business' && (
            <Input
              label="Business name"
              placeholder="e.g. Lagos Recyclers Ltd"
              required
              {...form2.register('business_name')}
              error={form2.formState.errors.business_name?.message}
            />
          )}

          {/* Mandatory Reva User Agreement */}
          <div className="p-3.5 bg-cream-50 rounded-xl border border-cream-200 space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                id="agree_to_policy"
                type="checkbox"
                className="mt-1 w-4 h-4 text-gold-500 rounded border-cream-300 focus:ring-gold-400"
                {...form2.register('agree_to_policy')}
              />
              <label htmlFor="agree_to_policy" className="text-xs text-dark-700 leading-relaxed cursor-pointer">
                <strong>Reva Hub User Agreement:</strong> I agree to use Reva Hub lawfully, honestly and responsibly. I will not engage in fraud, scams, theft, harassment, exploitation, unauthorized access, unlawful trading, or any activity that harms other users or the platform. I understand that Reva Hub may investigate reports, remove content, restrict transactions, suspend or terminate accounts, and cooperate with lawful investigations when necessary. I agree to Reva Hub's{' '}
                <Link to="/terms" target="_blank" className="text-gold-600 underline font-medium">Terms of Service</Link>,{' '}
                <Link to="/privacy" target="_blank" className="text-gold-600 underline font-medium">Privacy Policy</Link>, and{' '}
                <Link to="/policy" target="_blank" className="text-gold-600 underline font-medium">Trust, Safety & Acceptable Use Policy</Link>.
              </label>
            </div>
            {form2.formState.errors.agree_to_policy && (
              <p className="text-xs text-red-600 font-medium pl-6">
                {form2.formState.errors.agree_to_policy.message}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button type="submit" loading={signupMutation.isPending} className="flex-1">Create Account</Button>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-dark-600 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-gold-600 font-medium hover:underline">Log in</Link>
      </p>
    </div>
  )
}
