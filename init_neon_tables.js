const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_JI4bCNfL3wRs@ep-old-cell-b5o5jg1o-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  google_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  hashed_password VARCHAR(255),
  account_type VARCHAR(50) NOT NULL DEFAULT 'individual',
  business_name VARCHAR(255),
  cac_number VARCHAR(100),
  state VARCHAR(100) NOT NULL DEFAULT 'Lagos',
  lga VARCHAR(100) NOT NULL DEFAULT 'Lagos Island',
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  kyc_status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  kyc_provider_ref VARCHAR(500),
  kyc_started_at TIMESTAMPTZ,
  kyc_verified_at TIMESTAMPTZ,
  current_mode VARCHAR(50) NOT NULL DEFAULT 'buyer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_buyer BOOLEAN NOT NULL DEFAULT TRUE,
  is_seller BOOLEAN NOT NULL DEFAULT FALSE,
  is_staff BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_tutor BOOLEAN NOT NULL DEFAULT FALSE,
  tutor_status VARCHAR(50) NOT NULL DEFAULT 'none',
  tutor_specialty VARCHAR(255),
  tutor_applied_at TIMESTAMPTZ,
  tutor_approved_at TIMESTAMPTZ,
  avatar_url VARCHAR(500),
  completed_orders_count INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_verified_seller BOOLEAN NOT NULL DEFAULT FALSE,
  verified_seller_since TIMESTAMPTZ,
  reva_id VARCHAR(50) UNIQUE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_activated_at TIMESTAMPTZ,
  premium_expires_at TIMESTAMPTZ,
  premium_payment_reference VARCHAR(255),
  policy_version_accepted VARCHAR(20),
  policy_accepted_at TIMESTAMPTZ,
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  restriction_reason TEXT,
  restricted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 2. Listings
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(350) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  condition VARCHAR(50) NOT NULL,
  condition_notes TEXT,
  price_ngn NUMERIC(12,2) NOT NULL,
  state VARCHAR(100) NOT NULL DEFAULT 'Lagos',
  lga VARCHAR(100) NOT NULL,
  pickup_address VARCHAR(500),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  collection_method VARCHAR(50) NOT NULL DEFAULT 'either',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  moderation_status VARCHAR(50) NOT NULL DEFAULT 'approved',
  rejection_reason TEXT,
  ai_review_id VARCHAR(100),
  expires_at TIMESTAMPTZ,
  views_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  inquiries_count INTEGER NOT NULL DEFAULT 0,
  is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
  boosted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Listing Photos
CREATE TABLE IF NOT EXISTS listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_moderated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Offers
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_price_ngn NUMERIC(12,2) NOT NULL,
  proposed_quantity NUMERIC(10,2) NOT NULL,
  collection_method VARCHAR(50) NOT NULL DEFAULT 'either',
  message TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  counter_price_ngn NUMERIC(12,2),
  counter_quantity NUMERIC(10,2),
  counter_message TEXT,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  offer_id UUID REFERENCES offers(id),
  agreed_price_ngn NUMERIC(12,2) NOT NULL,
  agreed_quantity NUMERIC(10,2) NOT NULL,
  agreed_unit VARCHAR(50) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  commission_ngn NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  seller_proceeds_ngn NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  collection_method VARCHAR(50) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'escrow',
  escrow_status VARCHAR(50) NOT NULL DEFAULT 'held',
  order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  collection_deadline TIMESTAMPTZ,
  pickup_address VARCHAR(500),
  pickup_lga VARCHAR(100),
  tracking_code VARCHAR(50) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  raised_by_id UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolution_notes TEXT,
  sla_deadline TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Tutorials
CREATE TABLE IF NOT EXISTS tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(350) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  material_type VARCHAR(50) NOT NULL,
  material_subtypes JSONB,
  difficulty VARCHAR(50) NOT NULL DEFAULT 'beginner',
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  tags JSONB,
  video_url VARCHAR(500),
  materials_needed JSONB,
  author_id UUID NOT NULL REFERENCES users(id),
  author_type VARCHAR(50) NOT NULL DEFAULT 'staff',
  status VARCHAR(50) NOT NULL DEFAULT 'published',
  view_count INTEGER NOT NULL DEFAULT 0,
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- 9. Tutorial Sections
CREATE TABLE IF NOT EXISTS tutorial_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
  section_id VARCHAR(100) NOT NULL,
  heading VARCHAR(255) NOT NULL,
  body_markdown TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 1,
  video_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Tutorial Comments
CREATE TABLE IF NOT EXISTS tutorial_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tutorial_comments(id),
  body VARCHAR(1000) NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  moderation_status VARCHAR(50) NOT NULL DEFAULT 'approved',
  has_links BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 11. Tutor Interactive Sessions (Premium Exclusive)
CREATE TABLE IF NOT EXISTS tutor_interactive_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID NOT NULL REFERENCES tutorials(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL DEFAULT 'qa_priority',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  timestamp_seconds INTEGER,
  question_title VARCHAR(255) NOT NULL,
  details TEXT NOT NULL,
  student_project_url VARCHAR(500),
  preferred_date VARCHAR(100),
  tutor_reply TEXT,
  meeting_link VARCHAR(500),
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Price References
CREATE TABLE IF NOT EXISTS price_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  material VARCHAR(100) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  min_ngn NUMERIC(10,2) NOT NULL,
  max_ngn NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'approved',
  sources JSONB,
  sample_size INTEGER NOT NULL DEFAULT 10,
  confidence VARCHAR(50) NOT NULL DEFAULT 'high',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function initNeon() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Running Reva Hub schema initialization on Neon PostgreSQL...');
    await client.query(schemaSql);
    console.log('Tables created successfully!');

    // Check tables in public schema
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
    console.log(`Neon now has ${res.rows.length} verified public tables:`);
    res.rows.forEach(r => console.log('  - ' + r.table_name));

    await client.end();
    console.log('Schema setup complete and verified on Neon!');
  } catch (err) {
    console.error('Schema initialization failed:', err);
    process.exit(1);
  }
}

initNeon();
