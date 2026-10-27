import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Shield, Webhook, Copy, Check, ExternalLink, AlertTriangle, Activity, Settings as SettingsIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, extractError } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function StaffDashboardPage() {
  const queryClient = useQueryClient()
  const [webhookInput, setWebhookInput] = useState('')
  const [copied, setCopied] = useState(false)

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['staffSettings'],
    queryFn: async () => {
      const res = await api.get('/staff/settings')
      return res.data
    },
  })

  // Fetch health/status
  const { data: healthData } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const res = await api.get('/health')
      return res.data
    },
  })

  const savedWebhookUrl = settingsData?.paystack_webhook_url?.value || ''

  const saveWebhookMutation = useMutation({
    mutationFn: (url: string) => api.put('/staff/settings/webhook-url', { webhook_url: url }),
    onSuccess: (res) => {
      toast.success('Webhook URL saved in Reva Hub!')
      queryClient.invalidateQueries({ queryKey: ['staffSettings'] })
      setWebhookInput('')
    },
    onError: (err) => {
      toast.error(extractError(err))
    },
  })

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!webhookInput) return
    saveWebhookMutation.mutate(webhookInput.trim())
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="bg-dark-900 text-cream-50 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-gold-400 font-semibold mb-1">
            <Shield className="w-4 h-4" />
            <span>Staff Administration & Operations</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Staff Operations Dashboard</h1>
          <p className="text-xs text-cream-200 mt-1">
            Configure integration endpoints, inspect integration statuses, and access moderation queues.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin">
            <Button variant="secondary" className="text-xs">
              Admin Hub →
            </Button>
          </Link>
        </div>
      </div>

      {/* Integration Health Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-cream-200 space-y-4">
        <h2 className="font-display text-lg font-bold text-dark-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gold-600" />
          Platform Integration Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Payment Gateway', ok: healthData?.integrations?.payment },
            { label: 'Gemini AI Review', ok: healthData?.integrations?.gemini },
            { label: 'Email (Resend)', ok: healthData?.integrations?.resend },
            { label: 'SMS OTP (Termii)', ok: healthData?.integrations?.sms },
            { label: 'Cloud Storage', ok: healthData?.integrations?.storage },
            { label: 'KYC Provider', ok: healthData?.integrations?.kyc },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-cream-50 rounded-xl border border-cream-200 text-center">
              <span className={`inline-block w-2.5 h-2.5 rounded-full mb-1 ${item.ok ? 'bg-green-500' : 'bg-amber-400'}`} />
              <p className="text-xs font-semibold text-dark-800">{item.label}</p>
              <p className="text-[10px] text-dark-500">{item.ok ? 'Configured' : 'Dev / Mock Mode'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Paystack Webhook Configuration Section */}
      <div className="bg-white p-6 rounded-2xl border border-cream-200 space-y-6">
        <div>
          <h2 className="font-display text-lg font-bold text-dark-900 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-gold-600" />
            Paystack Webhook Endpoint Configuration
          </h2>
          <p className="text-xs text-dark-600 mt-1">
            Specify the public webhook URL where Paystack will deliver transaction notifications (<code className="bg-cream-100 px-1 rounded font-mono">/webhooks/payment</code>).
          </p>
        </div>

        {/* Current URL Display */}
        <div className="p-4 bg-cream-50 rounded-xl border border-cream-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-dark-700">Configured Webhook URL in Reva Hub:</span>
            {savedWebhookUrl && (
              <button
                type="button"
                onClick={() => handleCopy(savedWebhookUrl)}
                className="inline-flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 font-semibold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            )}
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-cream-200 font-mono text-xs text-dark-900 break-all select-all">
            {savedWebhookUrl || 'No webhook URL saved yet.'}
          </div>
        </div>

        {/* Form to update */}
        <form onSubmit={handleSave} className="space-y-3">
          <Input
            label="Update Webhook URL"
            type="url"
            placeholder="https://api.yourdomain.com/webhooks/payment"
            value={webhookInput}
            onChange={(e) => setWebhookInput(e.target.value)}
            helperText="Must be a valid HTTPS URL ending in /webhooks/payment"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!webhookInput}
              isLoading={saveWebhookMutation.isPending}
            >
              Save Webhook URL
            </Button>
          </div>
        </form>

        {/* Crucial Notice regarding Paystack Dashboard Registration */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Important Registration Instructions
          </div>
          <p>
            Saving the URL above inside Reva Hub stores it for your team's reference, but <strong>does not automatically register it with Paystack</strong>. You must configure this URL in the Paystack Dashboard:
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>Copy the verified HTTPS webhook URL above.</li>
            <li>Log in to your <strong>Paystack Dashboard</strong> at <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noopener noreferrer" className="underline font-semibold">dashboard.paystack.com</a>.</li>
            <li>Go to <strong>Settings → API Keys & Webhooks</strong>.</li>
            <li>Paste this URL in the <strong>Webhook URL</strong> field for Live / Test mode.</li>
            <li>Click <strong>Save Changes</strong> and use Paystack's <em>Test</em> trigger to verify live reception.</li>
          </ol>
        </div>
      </div>

      {/* Quick Navigation to Admin Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Listing Moderation', desc: 'Approve or flag materials', link: '/admin/listings' },
          { title: 'Dispute Resolution', desc: 'Resolve order conflicts', link: '/admin/disputes' },
          { title: 'Price References', desc: 'Manage benchmark ranges', link: '/admin/price-refs' },
          { title: 'Trust & Reports', desc: 'Review user reports', link: '/admin/reports' },
        ].map((c) => (
          <Link
            key={c.title}
            to={c.link}
            className="p-4 bg-white rounded-2xl border border-cream-200 hover:border-gold-400 hover:shadow-md transition-all group"
          >
            <h3 className="font-bold text-sm text-dark-900 group-hover:text-gold-600 transition-colors">{c.title}</h3>
            <p className="text-xs text-dark-500 mt-1">{c.desc}</p>
            <span className="text-xs text-gold-600 font-semibold mt-2 inline-block">Open module →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
