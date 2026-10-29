import React from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div className="border-b border-cream-200 pb-6">
        <h1 className="font-display text-3xl font-bold text-dark-900 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-gold-600" />
          Privacy Policy
        </h1>
        <p className="text-xs text-dark-500 mt-1">Platform Version 1.0 • Effective 2026</p>
      </div>

      <div className="prose prose-sm max-w-none text-dark-700 space-y-6 text-xs leading-relaxed">
        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">1. Information Collected</h2>
          <p>
            Reva Hub collects Nigerian phone numbers in E.164 format (+234), user names, optional email addresses, Lagos LGA location coordinates, material listing metadata, and transaction audit trails required to execute and verify marketplace trades.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">2. Identity Verification & KYC</h2>
          <p>
            Identity verification for verified-seller badges is conducted via accredited external KYC verification providers. Government identification numbers and biometric assets are evaluated by the provider under strict cryptographic protocols; Reva Hub stores only verification status tokens and provider references.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">3. Payment & Transaction Security</h2>
          <p>
            Card numbers, banking secrets, and direct financial credentials are never processed or retained on Reva Hub client devices or application databases. Payment operations occur via PCI-DSS compliant third-party payment partner webhooks.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">4. User Rights under NDPA</h2>
          <p>
            Users have the right to request access to, rectification of, or lawful deletion of their account records, subject to regulatory transaction record retention mandates for active disputes and fraud prevention.
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-cream-200 flex justify-between text-xs text-dark-500">
        <Link to="/terms" className="text-gold-600 hover:underline">← Terms of Service (Draft)</Link>
        <Link to="/policy" className="text-gold-600 hover:underline">Trust & Safety Policy →</Link>
      </div>
    </div>
  )
}
