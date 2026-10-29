"""Gemini AI assistant API endpoint for Revi (Exclusive to Reva Premium members)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.gemini_service import chat

router = APIRouter(tags=["ai"])


class ChatMessage(BaseModel):
    role: str  # "user" or "model" / "assistant"
    text: Optional[str] = None
    content: Optional[str] = None


class ChatRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    history: Optional[List[ChatMessage]] = None
    context_listing_id: Optional[str] = None
    context_tutorial_slug: Optional[str] = None


async def _handle_chat(req: ChatRequest, db: AsyncSession, current_user: User):
    if not (getattr(current_user, "is_premium", False) or getattr(current_user, "is_admin", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Revi AI Assistant is reserved exclusively for Reva Premium members. Please upgrade your account to Premium to unlock AI circular guidance.",
        )

    user_text = (req.message or req.prompt or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(user_text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    # Build history for Gemini
    history = []
    if req.history:
        for msg in req.history[-10:]:
            msg_role = "user" if msg.role == "user" else "model"
            content = msg.text or msg.content or ""
            if content:
                history.append({"role": msg_role, "parts": [content]})

    response_text = await chat(user_text, db, history if history else None)
    return {
        "response": response_text,
        "message": response_text,
        "assistant": "Revi",
        "name": "Revi",
        "is_premium": True,
        "disclaimer": "Revi is Reva Hub's circular economy assistant. Always verify important details directly.",
    }


@router.post("/ai/chat")
async def ai_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revi AI assistant chat endpoint (/ai/chat). Reserved for Reva Premium members."""
    return await _handle_chat(req, db, current_user)


@router.post("/gemini/chat")
async def gemini_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revi AI assistant chat endpoint fallback (/gemini/chat). Reserved for Reva Premium members."""
    return await _handle_chat(req, db, current_user)

