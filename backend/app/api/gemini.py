"""Gemini AI assistant API endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.user import User
from app.services.gemini_service import chat

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    text: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None
    context_listing_id: Optional[str] = None
    context_tutorial_slug: Optional[str] = None


@router.post("/chat")
async def ai_chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Reva AI assistant chat endpoint.

    The assistant uses real listing and tutorial data from the database.
    It cannot invent listings, prices, policies, or certifications.

    GEMINI_API_KEY must be configured server-side. This key is NEVER
    exposed to the frontend.
    """
    if not req.message or len(req.message.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(req.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    # Build history for Gemini
    history = []
    if req.history:
        for msg in req.history[-10:]:  # limit context window
            history.append({"role": msg.role, "parts": [msg.text]})

    response = await chat(req.message, db, history if history else None)
    return {"response": response, "disclaimer": "Reva AI helps you navigate the platform. Always verify important information directly."}
