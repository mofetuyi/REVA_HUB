import React from 'react'
import { AlertTriangle, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      <div className="border-b border-cream-200 pb-6">
        <h1 className="font-display text-3xl font-bold text-dark-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-gold-600" />
          Terms of Service
        </h1>
        <p className="text-xs text-dark-500 mt-1">Platform Version 1.0 • Effective 2026</p>
      </div>

      <div className="prose prose-sm max-w-none text-dark-700 space-y-6 text-xs leading-relaxed">
        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">1. Introduction & Acceptance</h2>
          <p>
            Reva Hub is a digital materials marketplace facilitating circular recovery in Lagos, Nigeria. By creating an account, browsing listings, or making offers, users agree to operate lawfully, honestly, and in compliance with Reva Hub's Trust, Safety and Acceptable Use Policy.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">2. Marketplace Transactions & Collection</h2>
          <p>
            Reva Hub connects sellers and buyers. Physical inspection, collection, and transport are arranged directly between the transaction participants. Users are responsible for confirming the weight, purity, and condition of recovered materials prior to confirming delivery.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">3. Escrow Integration Boundaries</h2>
          <p>
            Reva Hub does not directly hold buyer funds as a banking institution. Marketplace payments and escrow states are coordinated through licensed third-party payment infrastructure. Automatic release triggers are configurable and remain subject to active dispute status.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">4. Prohibited Materials & Safe Operations</h2>
          <p>
            Dealings in hazardous industrial chemicals, medical infectious bio-waste, explosive substances, and stolen items are strictly prohibited. Violators are subject to immediate account restriction and referral to authorities.
          </p>
        </section>

        <section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-2">
          <h2 className="text-sm font-bold text-dark-900">5. Limitation of Liability</h2>
          <p>
            [Subject to final formalization by legal counsel licensed in the Federal Republic of Nigeria.]
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-cream-200 flex justify-between text-xs text-dark-500">
        <Link to="/policy" className="text-gold-600 hover:underline">← Trust & Safety Policy</Link>
        <Link to="/privacy" className="text-gold-600 hover:underline">Privacy Policy (Draft) →</Link>
      </div>
    </div>
  )
}
