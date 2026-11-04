import React from 'react'
import { FileText, ExternalLink, ArrowRight, Shield, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TermsPage() {
  const officialTermsUrl = 'https://pencraftacademy.com.ng/termsandcndition'
  const officialPrivacyUrl = 'https://pencraftacademy.com.ng/privacy-policy'

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-cream-200 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-dark-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-gold-600" />
            Terms and Conditions
          </h1>
          <p className="text-xs text-dark-500 mt-1">Platform Version 1.0 • Effective 2026</p>
        </div>

        <a
          href={officialTermsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold text-xs rounded-xl shadow-sm transition-all hover:scale-[1.02]"
        >
          <span>Official Terms (Pencraft Academy)</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Official Link Banner */}
      <div className="bg-gold-50/80 border border-gold-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-100 text-gold-700 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-dark-900">Official Pencraft Academy Terms & Conditions</p>
            <p className="text-dark-600 font-mono text-[11px] truncate max-w-md">{officialTermsUrl}</p>
          </div>
        </div>
        <a
          href={officialTermsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-700 font-semibold hover:underline flex items-center gap-1 shrink-0"
        >
          View live terms <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Terms Content Sections */}
      <div className="prose prose-sm max-w-none text-dark-700 space-y-6 text-xs leading-relaxed">
        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            1. Agreement & Acceptance
          </h2>
          <p>
            Welcome to Reva Hub, an initiative operated in conjunction with Pencraft Academy (Lagos, Nigeria). By creating an account, browsing listings, publishing materials, placing orders, or utilizing Reva Learn, you enter into a legally binding agreement to comply with these Terms and Conditions and the official Pencraft Academy terms accessible at{' '}
            <a href={officialTermsUrl} target="_blank" rel="noopener noreferrer" className="text-gold-600 underline font-mono">{officialTermsUrl}</a>.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            2. Marketplace Operations, Escrow & 94% Seller Payouts
          </h2>
          <p>
            Reva Hub provides the marketplace infrastructure, pricing guidance, and escrow protection for recovered materials:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Escrow Protection:</strong> When a buyer pays for an order, funds are held securely in escrow via Paystack until goods are delivered.</li>
            <li><strong>Delivery Confirmation:</strong> When the buyer receives the material and clicks <em>"Delivered & Confirmed"</em> on the platform, <strong>94% of the order funds</strong> are automatically transferred directly into the seller's registered Nigerian bank account.</li>
            <li><strong>Platform Commission:</strong> A standard 6% marketplace facilitation fee is deducted from the transaction to fund platform development, trust & safety monitoring, and logistics coordination.</li>
          </ul>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            3. Quality, Weight & Physical Inspection
          </h2>
          <p>
            Buyers are encouraged to physically verify or inspect the weight, purity, and grading of recovered circular materials (such as PET flakes, HDPE, metals, and scrap) upon delivery or collection before confirming final receipt. If there is a material discrepancy or non-delivery, the buyer must raise a formal dispute on the order before delivery confirmation.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            4. Prohibited Items & Code of Conduct
          </h2>
          <p>
            Users are strictly prohibited from listing, trading, or transporting:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Stolen or unlawfully acquired scrap metals, municipal infrastructure, or equipment.</li>
            <li>Hazardous industrial waste, toxic chemical drums, explosive materials, or bio-medical infectious waste.</li>
            <li>Counterfeit, fraudulent, or non-existent items.</li>
          </ul>
          <p>
            Violations will result in immediate permanent account termination, forfeiture of escrow balances, and reporting to law enforcement authorities.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-3">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            5. Reva Premium Subscriptions
          </h2>
          <p>
            Reva Hub Premium is billed at ₦3,000 for a 30-day term, granting seller listing boosts, reduced commission rates, verified badge eligibility, and Reva Learn creator masterclasses. Subscriptions require verified Paystack payment and are non-refundable once activated.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            6. Governing Law & Jurisdiction
          </h2>
          <p>
            These terms are governed by and construed in accordance with the laws of the <strong>Federal Republic of Nigeria</strong>. Any disputes arising out of or in connection with the use of the platform shall be subject to the exclusive jurisdiction of the competent courts in Lagos State.
          </p>
        </section>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-cream-200 flex flex-wrap items-center justify-between gap-3 text-xs text-dark-500">
        <Link to="/privacy" className="text-gold-600 hover:underline flex items-center gap-1">
          ← Privacy Policy
        </Link>
        <div className="flex items-center gap-3">
          <a href={officialTermsUrl} target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:underline flex items-center gap-1">
            Pencraft Academy Terms <ExternalLink className="w-3 h-3" />
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
