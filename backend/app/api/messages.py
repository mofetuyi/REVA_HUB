"""API routes for In-App Buyer-Seller Messaging with Strict Anti-Disintermediation Supervision."""

import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.listing import Listing
from app.models.message import Conversation, Message
from app.services.moderation import supervise_message

router = APIRouter(prefix="/messages", tags=["messages"])
logger = logging.getLogger("messages_api")


class CreateConversationRequest(BaseModel):
    seller_id: str
    listing_id: Optional[str] = None
    initial_message: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns total unread messages count across all active conversations."""
    # Find conversations current user belongs to
    conv_q = await db.execute(
        select(Conversation.id).where(
            or_(Conversation.buyer_id == current_user.id, Conversation.seller_id == current_user.id)
        )
    )
    conv_ids = conv_q.scalars().all()
    if not conv_ids:
        return {"unread_count": 0}

    count_q = await db.execute(
        select(func.count(Message.id)).where(
            and_(
                Message.conversation_id.in_(conv_ids),
                Message.sender_id != current_user.id,
                Message.is_read == False,
            )
        )
    )
    unread = count_q.scalar() or 0
    return {"unread_count": unread}


@router.get("/conversations")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all buyer-seller chat threads for the current user."""
    q = await db.execute(
        select(Conversation)
        .where(or_(Conversation.buyer_id == current_user.id, Conversation.seller_id == current_user.id))
        .order_by(Conversation.last_message_at.desc())
    )
    convs = q.scalars().all()

    results = []
    for c in convs:
        # Determine other party
        other_id = c.seller_id if c.buyer_id == current_user.id else c.buyer_id
        other_res = await db.execute(select(User).where(User.id == other_id))
        other_user = other_res.scalar_one_or_none()

        # Listing info if linked
        listing_info = None
        if c.listing_id:
            lst_res = await db.execute(select(Listing).where(Listing.id == c.listing_id))
            listing = lst_res.scalar_one_or_none()
            if listing:
                listing_info = {
                    "id": str(listing.id),
                    "title": listing.title,
                    "price_ngn": float(listing.price_ngn),
                    "unit": listing.unit,
                }

        # Last message
        last_msg_res = await db.execute(
            select(Message)
            .where(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_res.scalar_one_or_none()

        # Unread count in this conversation
        unread_res = await db.execute(
            select(func.count(Message.id)).where(
                and_(
                    Message.conversation_id == c.id,
                    Message.sender_id != current_user.id,
                    Message.is_read == False,
                )
            )
        )
        unread_count = unread_res.scalar() or 0

        results.append({
            "id": str(c.id),
            "other_user": {
                "id": str(other_user.id) if other_user else str(other_id),
                "name": other_user.name if other_user else "Reva User",
                "is_verified": getattr(other_user, "is_verified_seller", False) if other_user else False,
            },
            "listing": listing_info,
            "last_message": {
                "content": last_msg.content if last_msg else None,
                "created_at": last_msg.created_at.isoformat() if last_msg else c.created_at.isoformat(),
                "sender_id": str(last_msg.sender_id) if last_msg else None,
                "is_read": last_msg.is_read if last_msg else True,
            } if last_msg else None,
            "unread_count": unread_count,
            "updated_at": c.last_message_at.isoformat(),
        })

    return results


@router.post("/conversations", status_code=status.HTTP_201_CREATED)
async def get_or_create_conversation(
    req: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Starts or opens an existing supervised conversation between buyer and seller."""
    if str(current_user.id) == req.seller_id:
        raise HTTPException(status_code=400, detail="You cannot start a conversation with yourself")

    # Check existing conversation
    conds = [
        or_(
            and_(Conversation.buyer_id == current_user.id, Conversation.seller_id == req.seller_id),
            and_(Conversation.buyer_id == req.seller_id, Conversation.seller_id == current_user.id),
        )
    ]
    if req.listing_id:
        conds.append(Conversation.listing_id == req.listing_id)

    q = await db.execute(select(Conversation).where(*conds))
    existing = q.scalar_one_or_none()
    if existing:
        return {"conversation_id": str(existing.id), "created": False}

    # Create new conversation
    now = datetime.now(timezone.utc)
    conv = Conversation(
        buyer_id=current_user.id,
        seller_id=req.seller_id,
        listing_id=req.listing_id,
        created_at=now,
        updated_at=now,
        last_message_at=now,
    )
    db.add(conv)
    await db.flush()

    # Optional initial message
    if req.initial_message:
        sanitized, is_flagged, reasons = supervise_message(req.initial_message)
        msg = Message(
            conversation_id=conv.id,
            sender_id=current_user.id,
            content=sanitized,
            original_content=req.initial_message if is_flagged else None,
            is_flagged=is_flagged,
            flag_reason=", ".join(reasons) if reasons else None,
            created_at=now,
        )
        db.add(msg)

    await db.commit()
    await db.refresh(conv)

    return {"conversation_id": str(conv.id), "created": True}


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetches full chat history for a conversation and marks incoming messages as read."""
    q = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = q.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if str(conv.buyer_id) != str(current_user.id) and str(conv.seller_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to view this chat")

    # Fetch other party
    other_id = conv.seller_id if conv.buyer_id == current_user.id else conv.buyer_id
    other_res = await db.execute(select(User).where(User.id == other_id))
    other_user = other_res.scalar_one_or_none()

    # Fetch listing info
    listing_info = None
    if conv.listing_id:
        lst_res = await db.execute(select(Listing).where(Listing.id == conv.listing_id))
        lst = lst_res.scalar_one_or_none()
        if lst:
            listing_info = {
                "id": str(lst.id),
                "title": lst.title,
                "price_ngn": float(lst.price_ngn),
                "unit": lst.unit,
                "pickup_address": lst.pickup_address,
                "lga": lst.lga,
            }

    # Fetch messages
    msg_q = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
    )
    messages = msg_q.scalars().all()

    # Mark incoming as read
    marked_any = False
    msg_list = []
    for m in messages:
        if str(m.sender_id) != str(current_user.id) and not m.is_read:
            m.is_read = True
            marked_any = True

        msg_list.append({
            "id": str(m.id),
            "sender_id": str(m.sender_id),
            "is_me": str(m.sender_id) == str(current_user.id),
            "content": m.content,
            "is_flagged": m.is_flagged,
            "flag_reason": m.flag_reason,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat(),
        })

    if marked_any:
        await db.commit()

    return {
        "id": str(conv.id),
        "other_user": {
            "id": str(other_user.id) if other_user else str(other_id),
            "name": other_user.name if other_user else "Reva User",
            "is_verified_seller": getattr(other_user, "is_verified_seller", False) if other_user else False,
        },
        "listing": listing_info,
        "escrow_guarantee_notice": "🔒 Reva Protected Chat: Messages are monitored in real time. Direct phone numbers, bank accounts, and off-platform payments are strictly filtered to keep your escrow guarantee active.",
        "messages": msg_list,
    }


@router.post("/conversations/{conversation_id}/send", status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: str,
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sends a supervised message. Detects and censors off-platform contact leaks."""
    q = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = q.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if str(conv.buyer_id) != str(current_user.id) and str(conv.seller_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to post in this chat")

    # Anti-disintermediation supervision analysis
    sanitized_content, is_flagged, reasons = supervise_message(req.content)

    now = datetime.now(timezone.utc)
    msg = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=sanitized_content,
        original_content=req.content if is_flagged else None,
        is_flagged=is_flagged,
        flag_reason=", ".join(reasons) if reasons else None,
        is_read=False,
        created_at=now,
    )
    db.add(msg)

    conv.last_message_at = now
    conv.updated_at = now
    await db.commit()
    await db.refresh(msg)

    warning_notice = None
    if is_flagged:
        warning_notice = (
            "⚠️ Reva Security Alert: Sharing external contact information (phone numbers, WhatsApp, "
            "or direct bank accounts) is prohibited under Reva Escrow policy. Sensitive details were redacted."
        )

    return {
        "id": str(msg.id),
        "sender_id": str(msg.sender_id),
        "is_me": True,
        "content": msg.content,
        "is_flagged": msg.is_flagged,
        "flag_reason": msg.flag_reason,
        "warning_notice": warning_notice,
        "created_at": msg.created_at.isoformat(),
    }


@router.get("/admin/flagged")
async def get_flagged_messages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Platform Trust & Safety moderation endpoint: view all intercepted off-platform attempts."""
    if not current_user.is_admin and not current_user.is_staff:
        raise HTTPException(status_code=403, detail="Staff/Admin privileges required")

    q = await db.execute(
        select(Message)
        .where(Message.is_flagged == True)
        .order_by(Message.created_at.desc())
        .limit(50)
    )
    flagged = q.scalars().all()

    results = []
    for m in flagged:
        sender_res = await db.execute(select(User).where(User.id == m.sender_id))
        sender = sender_res.scalar_one_or_none()
        results.append({
            "id": str(m.id),
            "conversation_id": str(m.conversation_id),
            "sender_name": sender.name if sender else "Unknown",
            "sender_phone": sender.phone if sender else "N/A",
            "content": m.content,
            "original_content": m.original_content,
            "flag_reason": m.flag_reason,
            "created_at": m.created_at.isoformat(),
        })
    return {"flagged_messages": results}
