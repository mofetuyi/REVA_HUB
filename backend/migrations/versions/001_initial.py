"""Initial schema migration for Reva Platform.

Revision ID: 001_initial
Revises: None
Create Date: 2026-10-26 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("phone", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("email", sa.String(255), unique=True, nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("account_type", sa.String(50), nullable=False, server_default="individual"),
        sa.Column("business_name", sa.String(255), nullable=True),
        sa.Column("cac_number", sa.String(100), nullable=True),
        sa.Column("state", sa.String(100), nullable=False, server_default="Lagos"),
        sa.Column("lga", sa.String(100), nullable=False),
        sa.Column("is_phone_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("kyc_status", sa.String(50), nullable=False, server_default="not_started"),
        sa.Column("kyc_provider_ref", sa.String(500), nullable=True),
        sa.Column("kyc_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("kyc_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_mode", sa.String(50), nullable=False, server_default="buyer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_buyer", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_seller", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_staff", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("completed_orders_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_rating", sa.Numeric(3, 2), nullable=False, server_default="0.00"),
        sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_verified_seller", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verified_seller_since", sa.DateTime(timezone=True), nullable=True),
        # Reva ID & Premium
        sa.Column("reva_id", sa.String(50), unique=True, nullable=True, index=True),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("premium_activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("premium_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("premium_payment_reference", sa.String(255), nullable=True),
        # Compliance & Trust
        sa.Column("policy_version_accepted", sa.String(20), nullable=True),
        sa.Column("policy_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_restricted", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("restriction_reason", sa.Text(), nullable=True),
        sa.Column("restricted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("restricted_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Listings
    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("seller_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("slug", sa.String(300), unique=True, nullable=False, index=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("condition", sa.String(50), nullable=False),
        sa.Column("condition_notes", sa.Text(), nullable=True),
        sa.Column("price_ngn", sa.Numeric(15, 2), nullable=False),
        sa.Column("lga", sa.String(100), nullable=False),
        sa.Column("pickup_address", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("collection_method", sa.String(50), nullable=False, server_default="buyer_arranges"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active", index=True),
        sa.Column("moderation_status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("moderation_notes", sa.Text(), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_flagged", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("flag_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("flagged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("listed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Listing Photos
    op.create_table(
        "listing_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Offers
    op.create_table(
        "offers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("listings.id"), nullable=False, index=True),
        sa.Column("buyer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("seller_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("parent_offer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("offers.id"), nullable=True),
        sa.Column("offered_price_ngn", sa.Numeric(15, 2), nullable=False),
        sa.Column("offered_quantity", sa.Numeric(12, 3), nullable=True),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Orders
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("listings.id"), nullable=False, index=True),
        sa.Column("buyer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("seller_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("offer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("offers.id"), nullable=True),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("unit_price_ngn", sa.Numeric(15, 2), nullable=False),
        sa.Column("total_amount_ngn", sa.Numeric(15, 2), nullable=False),
        sa.Column("commission_rate", sa.Numeric(5, 4), nullable=True),
        sa.Column("commission_ngn", sa.Numeric(15, 2), nullable=True),
        sa.Column("processing_fee_ngn", sa.Numeric(15, 2), nullable=True),
        sa.Column("seller_proceeds_ngn", sa.Numeric(15, 2), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="created", index=True),
        sa.Column("payment_reference", sa.String(255), unique=True, nullable=True, index=True),
        sa.Column("escrow_reference", sa.String(255), nullable=True),
        sa.Column("collection_arranger", sa.String(50), nullable=True),
        sa.Column("collection_notes", sa.Text(), nullable=True),
        sa.Column("delivery_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_notes", sa.Text(), nullable=True),
        sa.Column("escrow_release_scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("escrow_released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("funded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("in_transit_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Order Events
    op.create_table(
        "order_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False, index=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("metadata", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Disputes
    op.create_table(
        "disputes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), unique=True, nullable=False),
        sa.Column("raised_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="open"),
        sa.Column("resolved_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolution", sa.String(50), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_escalated", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Dispute Evidence
    op.create_table(
        "dispute_evidence",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("dispute_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_url", sa.String(1000), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Reviews
    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reviewee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("review_type", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("order_id", "reviewer_id", name="uq_order_reviewer"),
    )

    # Reva Learn: Tutorials
    op.create_table(
        "tutorials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(300), unique=True, nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("material_type", sa.String(50), nullable=False),
        sa.Column("difficulty", sa.String(50), nullable=False),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("author_type", sa.String(50), nullable=False, server_default="staff"),
        sa.Column("status", sa.String(50), nullable=False, server_default="published"),
        sa.Column("cover_image_url", sa.String(1000), nullable=True),
        sa.Column("video_platform", sa.String(50), nullable=True),
        sa.Column("video_id", sa.String(255), nullable=True),
        sa.Column("materials_needed", postgresql.JSON(), nullable=True),
        sa.Column("tools_needed", postgresql.JSON(), nullable=True),
        sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completions_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_rating", sa.Numeric(3, 2), nullable=False, server_default="0.00"),
        sa.Column("rating_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Tutorial Sections
    op.create_table(
        "tutorial_sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tutorial_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content_markdown", sa.Text(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Skill Paths
    op.create_table(
        "skill_paths",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(300), unique=True, nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("material_type", sa.String(50), nullable=False),
        sa.Column("cover_image_url", sa.String(1000), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "skill_path_tutorials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("skill_path_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skill_paths.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tutorial_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
    )

    # Learn progress
    op.create_table(
        "tutorial_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tutorial_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_bookmarked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "tutorial_id", name="uq_user_tutorial_progress"),
    )

    op.create_table(
        "skill_path_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_path_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skill_paths.id", ondelete="CASCADE"), nullable=False),
        sa.Column("completed_tutorials_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "skill_path_id", name="uq_user_skillpath_progress"),
    )

    op.create_table(
        "tutorial_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tutorial_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_comment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tutorial_comments.id"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("moderation_status", sa.String(50), nullable=False, server_default="approved"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "tutorial_ratings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tutorial_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tutorial_id", "user_id", name="uq_tutorial_user_rating"),
    )

    # Ads
    op.create_table(
        "ad_placements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("placement_type", sa.String(50), nullable=False),
        sa.Column("creative_type", sa.String(50), nullable=False),
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("target_url", sa.String(1000), nullable=False),
        sa.Column("alt_text", sa.String(255), nullable=True),
        sa.Column("html_content", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("impressions_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clicks_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "ad_impressions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ad_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ad_placements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("page_path", sa.String(500), nullable=False),
        sa.Column("is_click", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "material_listing_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tutorial_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relevance_type", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Compliance: Reports, EnforcementActions, ModerationLogs, StaffSettings
    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("reason", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("evidence_urls", postgresql.JSON(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="open", index=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("resolved_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "enforcement_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("target_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("report_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("reports.id"), nullable=True),
        sa.Column("level", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("evidence_preserved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("appeal_text", sa.Text(), nullable=True),
        sa.Column("appeal_submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("appeal_resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("appeal_resolved_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "moderation_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "staff_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Listing Review Results & Price References
    op.create_table(
        "listing_review_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("decision", sa.String(50), nullable=False),
        sa.Column("reasons", postgresql.JSON(), nullable=True),
        sa.Column("price_assessment", sa.String(50), nullable=True),
        sa.Column("suggested_price_range_ngn", postgresql.JSON(), nullable=True),
        sa.Column("policy_flags", postgresql.JSON(), nullable=True),
        sa.Column("model_used", sa.String(100), nullable=True),
        sa.Column("raw_response", sa.Text(), nullable=True),
        sa.Column("appeal_text", sa.Text(), nullable=True),
        sa.Column("appeal_submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "price_references",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("category", sa.String(50), nullable=False, index=True),
        sa.Column("material", sa.String(100), nullable=False),
        sa.Column("unit", sa.String(20), nullable=False),
        sa.Column("min_ngn", sa.Numeric(15, 2), nullable=True),
        sa.Column("max_ngn", sa.Numeric(15, 2), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="proposed", index=True),
        sa.Column("sources", postgresql.JSON(), nullable=True),
        sa.Column("sample_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confidence", sa.String(50), nullable=False, server_default="low"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("price_references")
    op.drop_table("listing_review_results")
    op.drop_table("staff_settings")
    op.drop_table("moderation_logs")
    op.drop_table("enforcement_actions")
    op.drop_table("reports")
    op.drop_table("material_listing_links")
    op.drop_table("ad_impressions")
    op.drop_table("ad_placements")
    op.drop_table("tutorial_ratings")
    op.drop_table("tutorial_comments")
    op.drop_table("skill_path_progress")
    op.drop_table("tutorial_progress")
    op.drop_table("skill_path_tutorials")
    op.drop_table("skill_paths")
    op.drop_table("tutorial_sections")
    op.drop_table("tutorials")
    op.drop_table("reviews")
    op.drop_table("dispute_evidence")
    op.drop_table("disputes")
    op.drop_table("order_events")
    op.drop_table("orders")
    op.drop_table("offers")
    op.drop_table("listing_photos")
    op.drop_table("listings")
    op.drop_table("users")
