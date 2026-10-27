"""Gemini AI assistant service for Reva.

Connects to Google Gemini API server-side.
GEMINI_API_KEY is read from environment — never exposed to the frontend.

The assistant can search listings and tutorials to provide context-aware answers.
It is instructed NOT to invent listings, prices, policies, or certifications.
"""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.listing import Listing, ListingStatus
from app.models.tutorial import Tutorial, TutorialStatus

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Reva assistant, helping users navigate Reva — Lagos, Nigeria's marketplace for recovered materials and the Reva Learn platform.

Your role:
- Help users find materials, understand listings, and discover tutorials
- Answer questions about how Reva works
- Guide users through processes (signup, making offers, ordering, disputes)

STRICT RULES:
- NEVER invent listings, prices, availability, or market data
- NEVER claim certifications, compliance, or legal guarantees
- NEVER guarantee safety of materials or products
- NEVER invent policies not stated to you
- If you don't know something, say so clearly
- Always recommend users verify important information directly on the platform
- You operate only for Lagos, Nigeria

When given listing or tutorial data, use only that data to answer.
If no relevant listings/tutorials are found, say so clearly.
"""


async def get_relevant_context(query: str, db: AsyncSession) -> str:
    """Fetch relevant listings and tutorials from DB to ground the assistant."""
    context_parts = []

    # Simple keyword search in listings
    try:
        result = await db.execute(
            select(Listing)
            .where(
                Listing.status == ListingStatus.active,
                Listing.description.ilike(f"%{query[:50]}%"),
            )
            .limit(3)
        )
        listings = result.scalars().all()
        if listings:
            context_parts.append("=== Relevant active marketplace listings ===")
            for lst in listings:
                context_parts.append(
                    f"- {lst.title} | Category: {lst.category.value} | "
                    f"Price: ₦{lst.price_ngn:,.0f} | LGA: {lst.lga} | "
                    f"Quantity: {lst.quantity} {lst.unit.value}"
                )
    except Exception:
        pass

    # Simple keyword search in tutorials
    try:
        result = await db.execute(
            select(Tutorial)
            .where(
                Tutorial.status == TutorialStatus.published,
                Tutorial.title.ilike(f"%{query[:50]}%"),
            )
            .limit(3)
        )
        tutorials = result.scalars().all()
        if tutorials:
            context_parts.append("=== Relevant Reva Learn tutorials ===")
            for tut in tutorials:
                context_parts.append(
                    f"- {tut.title} | Material: {tut.material_type.value} | "
                    f"Difficulty: {tut.difficulty.value} | "
                    f"Duration: {tut.estimated_duration_minutes} min"
                )
    except Exception:
        pass

    return "\n".join(context_parts) if context_parts else ""


async def chat(user_message: str, db: AsyncSession, conversation_history: list | None = None) -> str:
    """Send a message to Gemini and return the response.

    Falls back to a helpful message if GEMINI_API_KEY is not configured.
    """
    if not settings.gemini_configured:
        logger.warning("GEMINI_API_KEY not configured. Returning placeholder response.")
        return (
            "The Reva AI assistant is not yet configured. "
            "Please set GEMINI_API_KEY in your environment to enable this feature."
        )

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )

        # Fetch grounding context from DB
        context = await get_relevant_context(user_message, db)

        # Build the prompt with context
        augmented_message = user_message
        if context:
            augmented_message = (
                f"Context from Reva's database:\n{context}\n\n"
                f"User question: {user_message}"
            )

        # Build conversation
        history = conversation_history or []
        chat_session = model.start_chat(history=history)
        response = await chat_session.send_message_async(augmented_message)
        return response.text

    except Exception as exc:
        logger.exception("Gemini API error: %s", exc)
        return (
            "I'm having trouble connecting right now. Please try again in a moment, "
            "or browse the marketplace and Reva Learn directly."
        )
