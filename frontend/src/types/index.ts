// Reva Hub TypeScript types

export type AccountType = 'individual' | 'business';
export type UserMode = 'buyer' | 'seller';
export type KYCStatus = 'not_started' | 'in_progress' | 'verified' | 'rejected';

export interface User {
  id: string;
  phone?: string;
  email?: string;
  google_id?: string;
  name: string;
  account_type: AccountType;
  business_name?: string;
  state: string;
  lga: string;
  is_phone_verified?: boolean;
  is_email_verified?: boolean;
  kyc_status: KYCStatus;
  current_mode: UserMode;
  is_buyer: boolean;
  is_seller: boolean;
  is_staff: boolean;
  is_admin: boolean;
  is_tutor?: boolean;
  tutor_status?: 'none' | 'pending' | 'approved' | 'rejected';
  tutor_specialty?: string;
  avatar_url?: string;
  average_rating?: number;
  review_count?: number;
  completed_orders_count?: number;
  is_verified_seller?: boolean;
  created_at: string;
  // Reva ID and Premium
  reva_id?: string;
  is_premium?: boolean;
  premium_expires_at?: string | null;
  premium_activated_at?: string | null;
  // Compliance
  policy_version_accepted?: string | null;
  policy_accepted_at?: string | null;
}

// ── Report / Compliance ─────────────────────────────────────────────────────
export type ReportTargetType = 'listing' | 'user' | 'tutorial' | 'review' | 'order';
export type ReportReason =
  | 'fraud_scam'
  | 'stolen_goods'
  | 'prohibited_item'
  | 'harassment'
  | 'spam'
  | 'fake_account'
  | 'payment_abuse'
  | 'other';
export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description: string;
  evidence_urls?: string[];
  status: ReportStatus;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

// ── AI Listing Review ───────────────────────────────────────────────────────
export type ReviewDecision = 'approve' | 'needs_review' | 'reject';
export type PriceAssessment = 'too_low' | 'fair' | 'too_high' | 'cannot_judge';

export interface ListingReviewResult {
  id: string;
  listing_id: string;
  decision: ReviewDecision;
  reasons: string[];
  price_assessment: PriceAssessment;
  suggested_price_range_ngn?: { min: number; max: number } | null;
  policy_flags: string[];
  model_used: string;
  created_at: string;
}

// ── Price Reference ─────────────────────────────────────────────────────────
export type PriceRefStatus = 'proposed' | 'approved' | 'stale';

export interface PriceReference {
  id: string;
  category: string;
  material: string;
  unit: string;
  min_ngn: number;
  max_ngn: number;
  status: PriceRefStatus;
  sources: string[];
  sample_size: number;
  confidence: 'low' | 'medium' | 'high';
  updated_at: string;
  approved_by?: string | null;
}

export type ListingCategory = 'plastic' | 'fabric' | 'leather' | 'wood' | 'cardboard' | 'clothes' | 'circular_products' | 'other';
export type ListingUnit = 'kg' | 'tonnes' | 'bags' | 'pieces' | 'bundles' | 'litres';
export type ListingCondition = 'new' | 'like_new' | 'used' | 'mixed';
export type CollectionMethod = 'buyer_arranges' | 'seller_arranges' | 'either';
export type ListingStatus = 'active' | 'expired' | 'delisted' | 'sold';

export interface ListingPhoto {
  url: string;
  order_index: number;
}

export interface Seller {
  id: string;
  name: string;
  lga: string;
  average_rating: number;
  review_count: number;
  is_verified_seller: boolean;
  avatar_url?: string;
  member_since: string;
}

export interface Listing {
  id: string;
  slug: string;
  category: ListingCategory;
  title: string;
  description: string;
  quantity: number;
  unit: ListingUnit;
  condition: ListingCondition;
  condition_notes?: string;
  price_ngn: number;
  lga: string;
  pickup_address?: string;
  latitude?: number;
  longitude?: number;
  collection_method: CollectionMethod;
  status: ListingStatus;
  moderation_status: 'pending' | 'approved' | 'rejected';
  view_count: number;
  listed_at: string;
  expires_at: string;
  created_at: string;
  photos: ListingPhoto[];
  seller?: Seller;
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired' | 'withdrawn';

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  proposed_price: number;
  proposed_quantity?: number;
  unit?: string;
  message?: string;
  status: OfferStatus;
  counter_price?: number;
  counter_quantity?: number;
  counter_message?: string;
  parent_offer_id?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export type OrderStatus =
  | 'created' | 'payment_pending' | 'funded' | 'in_transit'
  | 'delivered' | 'confirmed' | 'released' | 'disputed'
  | 'refunded' | 'completed' | 'cancelled';

export interface OrderEvent {
  event_type: string;
  description: string;
  created_at: string;
}

export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_id?: string;
  quantity: number;
  unit: string;
  unit_price_ngn: number;
  total_amount_ngn: number;
  commission_rate: number;
  commission_ngn: number;
  processing_fee_ngn: number;
  seller_proceeds_ngn: number;
  payment_provider?: string;
  payment_reference?: string;
  status: OrderStatus;
  collection_arranged_by?: 'buyer' | 'seller' | 'tbd';
  collection_notes?: string;
  delivery_confirmed_at?: string;
  delivery_notes?: string;
  auto_release_at?: string;
  created_at: string;
  updated_at: string;
  funded_at?: string;
  completed_at?: string;
  events: OrderEvent[];
}

export type DisputeReason =
  | 'condition_not_as_described' | 'quantity_mismatch'
  | 'delivery_not_received' | 'damaged_in_transit' | 'other';

export type DisputeStatus =
  | 'open' | 'under_review' | 'resolved_refund'
  | 'resolved_release' | 'escalated' | 'closed';

export interface Dispute {
  id: string;
  order_id: string;
  raised_by_id: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  resolution_notes?: string;
  sla_deadline: string;
  created_at: string;
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  created_at: string;
}

// ── Reva Learn types ─────────────────────────────────────────────────────────

export type MaterialType = 'plastic' | 'fabric' | 'leather' | 'wood' | 'cardboard' | 'clothes' | 'circular_products' | 'multi';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type TutorialStatus = 'draft' | 'pending_review' | 'published' | 'archived';
export type VideoPlatform = 'youtube' | 'vimeo';

export interface TutorialSection {
  id: string;
  section_id: string;
  heading: string;
  body_markdown: string;
  order_index: number;
  image_url?: string;
  image_alt?: string;
  image_caption?: string;
  video_platform?: VideoPlatform;
  video_id?: string;
  video_start_time?: number;
}

export interface Tutorial {
  id: string;
  slug: string;
  title: string;
  description: string;
  material_type: MaterialType;
  material_subtypes?: string[];
  difficulty: Difficulty;
  estimated_duration_minutes: number;
  tags?: string[];
  author_id?: string;
  author_type?: 'staff' | 'tutor' | 'community' | string;
  author_name?: string;
  status: TutorialStatus;
  view_count: number;
  rating_average: number;
  rating_count: number;
  created_at: string;
  published_at?: string;
  video_url?: string;
  materials_needed?: string[];
  earnings_naira?: number;
  sections?: TutorialSection[];
  ads?: AdPlacement[];
}

export interface SkillPath {
  id: string;
  title: string;
  description: string;
  material_type: MaterialType;
  difficulty: Difficulty;
  tutorial_count: number;
  tutorials?: SkillPathTutorial[];
  user_progress?: SkillPathProgress;
}

export interface SkillPathTutorial {
  tutorial_id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  estimated_duration_minutes: number;
  sequence: number;
  is_required: boolean;
  has_prerequisite: boolean;
}

export interface TutorialProgress {
  tutorial_id: string;
  progress_percentage: number;
  is_bookmarked: boolean;
  completed_at?: string;
  started_at: string;
}

export interface SkillPathProgress {
  skill_path_id: string;
  enrolled_at: string;
  progress_percentage: number;
  tutorials_completed: number;
  completed_at?: string;
  badge_awarded: boolean;
}

export interface TutorialComment {
  id: string;
  author_id: string;
  body: string;
  is_pinned: boolean;
  helpful_count: number;
  created_at: string;
  replies: TutorialComment[];
}

export interface AdPlacement {
  id: string;
  placement_type: 'pre_tutorial' | 'banner' | 'inline';
  creative_type: 'video' | 'banner' | 'inline';
  creative_url: string;
  call_to_action?: string;
  skip_after_seconds?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages?: number;
}

export interface ApiError {
  detail: string;
  status?: number;
}

export interface FeeBreakdown {
  amount_ngn: number;
  commission_rate: number;
  commission_ngn: number;
  processing_fee_ngn: number;
  reva_net_ngn: number;
  seller_proceeds_ngn: number;
}

export interface TutorInteractiveSession {
  id: string;
  tutorial_id: string;
  tutorial_title?: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  tutor_id?: string;
  tutor_name?: string;
  session_type: 'qa_priority' | 'critique' | 'one_on_one_call';
  status: 'pending' | 'answered' | 'completed';
  timestamp_seconds?: number;
  question_title: string;
  details: string;
  student_project_url?: string;
  preferred_date?: string;
  tutor_reply?: string;
  meeting_link?: string;
  replied_at?: string;
  created_at: string;
}

