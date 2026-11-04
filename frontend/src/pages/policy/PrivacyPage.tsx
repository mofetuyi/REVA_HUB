import React from 'react'
import { ShieldCheck, ExternalLink, ArrowRight, Lock, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  const officialPrivacyUrl = 'https://pencraftacademy.com.ng/privacy-policy'
  const officialTermsUrl = 'https://pencraftacademy.com.ng/termsandcndition'

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-cream-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-gold-600" />
            Privacy Policy
          </h1>
          <p className="text-xs text-dark-500 mt-1">Platform Version 1.0 • Effective 2026</p>
        </div>

        <a
          href={officialPrivacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold text-xs rounded-xl shadow-sm transition-all hover:scale-[1.02]"
        >
          <span>Official Document (Pencraft Academy)</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Official Link Banner */}
      <div className="bg-gold-50/80 border border-gold-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-100 text-gold-700 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-dark-900">Official Pencraft Academy Privacy Policy</p>
            <p className="text-dark-600 font-mono text-[11px] truncate max-w-md">{officialPrivacyUrl}</p>
          </div>
        </div>
        <a
          href={officialPrivacyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-700 font-semibold hover:underline flex items-center gap-1 shrink-0"
        >
          View live policy <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Policy Content Sections */}
      <div className="prose prose-sm max-w-none text-dark-700 space-y-6 text-xs leading-relaxed">
        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            1. Introduction & Scope
          </h2>
          <p>
            Reva Hub (a division of Pencraft Academy, Lagos, Nigeria) operates as a digital circular materials marketplace and upcycling education platform. This Privacy Policy outlines how we collect, store, safeguard, and process your personal and transaction data in accordance with the <strong>Nigeria Data Protection Act (NDPA)</strong>.
          </p>
          <p>
            By creating an account, publishing listings, purchasing materials, or enrolling in training on Reva Hub, you consent to the data practices described in this document and our official policy at <a href={officialPrivacyUrl} target="_blank" rel="noopener noreferrer" className="text-gold-600 underline font-mono">{officialPrivacyUrl}</a>.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            2. Information We Collect
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Account & Contact Data:</strong> Full name, verified Nigerian phone number in E.164 format (+234), optional email address, and encrypted password hash.</li>
            <li><strong>Location & Logistics Data:</strong> Lagos Local Government Area (LGA), neighborhood, pickup addresses, and delivery destination details provided for material collection and dispatch.</li>
            <li><strong>Listing & Trading Information:</strong> Material specifications, categories, quantities, photographs, pricing, offer negotiations, and escrow audit logs.</li>
            <li><strong>Banking & Payout Details:</strong> For sellers receiving automated 94% payouts, Nigerian bank account number, bank code, and account name registered via Paystack transfer recipient infrastructure.</li>
          </ul>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            3. Verification & Authentication Security
          </h2>
          <p>
            Account authentication and two-step verification are powered by automated WhatsApp OTP verification via our secure gateway. We do not sell or share phone numbers or communication transcripts with unauthorized third parties.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            4. Payment & Financial Data Protection
          </h2>
          <p>
            Reva Hub does not collect or store full credit/debit card numbers or sensitive banking PINs. All payments, escrow holdings, and seller payouts are processed securely through PCI-DSS Level 1 compliant infrastructure (Paystack) with automated HMAC-SHA512 webhook signature verification.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            5. User Rights Under the Nigeria Data Protection Act (NDPA)
          </h2>
          <p>
            Under the NDPA, you have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Access the personal information we hold concerning your account.</li>
            <li>Request immediate correction of inaccurate or incomplete contact and profile records.</li>
            <li>Request the deletion or anonymization of your personal data, subject to financial accounting and active dispute retention laws.</li>
            <li>Object to or restrict specific processing operations.</li>
          </ul>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            6. Inquiries & Legal Entity
          </h2>
          <p>
            For privacy inquiries, data access requests, or official notices, please visit{' '}
            <a href={officialPrivacyUrl} target="_blank" rel="noopener noreferrer" className="text-gold-600 underline font-medium">
              pencraftacademy.com.ng/privacy-policy
            </a>{' '}
            or contact our compliance desk at <strong>support@reva-marketplace.com.ng</strong>.
          </p>
        </section>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-cream-200 flex flex-wrap items-center justify-between gap-3 text-xs text-dark-500">
        <Link to="/terms" className="text-gold-600 hover:underline flex items-center gap-1">
          ← Terms and Conditions
        </Link>
        <div className="flex items-center gap-3">
          <a href={officialPrivacyUrl} target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:underline flex items-center gap-1">
            Pencraft Academy Privacy <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <Link to="/policy" className="text-gold-600 hover:underline">
            Trust & Safety Policy →
          </Link>
        </div>
      </div>
    </div>
  )
}
