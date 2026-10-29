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
    image_url: Optional[str] = None


class ChatRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    history: Optional[List[ChatMessage]] = None
    image_data: Optional[str] = None
    image_mime_type: Optional[str] = None
    context_listing_id: Optional[str] = None
    context_tutorial_slug: Optional[str] = None


async def _handle_chat(req: ChatRequest, db: AsyncSession, current_user: User):
    if not (getattr(current_user, "is_premium", False) or getattr(current_user, "is_admin", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Revi AI Assistant is reserved exclusively for Reva Premium members. Free accounts cannot send messages. Please upgrade your account to Premium.",
        )

    user_text = (req.message or req.prompt or "").strip()
    image_b64 = None
    image_mime = req.image_mime_type or "image/jpeg"

    if req.image_data:
        raw_img = req.image_data.strip()
        if raw_img.startswith("data:"):
            try:
                header, b64_part = raw_img.split(",", 1)
                image_b64 = b64_part
                if ";" in header:
                    image_mime = header.split(";")[0].replace("data:", "")
            except Exception:
                image_b64 = raw_img
        else:
            image_b64 = raw_img

    if not user_text and not image_b64:
        raise HTTPException(status_code=400, detail="Message or image is required")
    if user_text and len(user_text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    # Build history for Gemini
    history = []
    if req.history:
        for msg in req.history[-10:]:
            msg_role = "user" if msg.role == "user" else "model"
            content = msg.text or msg.content or ""
            if content:
                history.append({"role": msg_role, "parts": [content]})

    response_text = await chat(
        user_message=user_text,
        db=db,
        conversation_history=history if history else None,
        image_b64=image_b64,
        image_mime_type=image_mime,
    )
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

