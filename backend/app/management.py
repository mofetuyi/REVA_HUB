"""Management CLI for Reva backend.

Usage:
    python -m app.management create_staff --phone +2348012345678 --name "Staff Name"
    python -m app.management list_staff
    python -m app.management backfill_reva_ids
"""

import asyncio
import sys
import argparse
import logging
import uuid
from datetime import datetime, timezone
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_staff_account(phone: str, name: str, password: str, is_admin: bool = False):
    """Provision a staff account. Requires direct server/database access."""
    from app.core.database import AsyncSessionLocal
    from app.core.security import hash_password
    from app.models.user import User, AccountType, UserMode

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.phone == phone))
        if existing.scalar_one_or_none():
            logger.error("User with phone %s already exists", phone)
            return

        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            phone=phone,
            name=name,
            hashed_password=hash_password(password),
            state="Lagos",
            lga="Ikeja",
            account_type=AccountType.individual,
            is_buyer=True,
            is_seller=False,
            is_staff=True,
            is_admin=is_admin,
            is_phone_verified=True,
            current_mode=UserMode.buyer,
        )
        user.reva_id = f"REVA-{str(user_id).upper()}"
        db.add(user)
        await db.commit()
        logger.info(
            "Staff account created: %s (phone=%s, reva_id=%s, is_admin=%s)",
            name, phone, user.reva_id, is_admin,
        )


async def backfill_reva_ids():
    """Generate reva_id for any existing users who do not have one."""
    from app.core.database import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.reva_id.is_(None)))
        users = result.scalars().all()
        count = 0
        for u in users:
            u.reva_id = f"REVA-{str(u.id).upper()}"
            count += 1
        await db.commit()
        logger.info("Backfilled reva_id for %d users", count)


def main():
    parser = argparse.ArgumentParser(description="Reva management commands")
    subparsers = parser.add_subparsers(dest="command")

    staff_parser = subparsers.add_parser("create_staff")
    staff_parser.add_argument("--phone", required=True)
    staff_parser.add_argument("--name", required=True)
    staff_parser.add_argument("--password", default="ChangeMe123!")
    staff_parser.add_argument("--admin", action="store_true")

    subparsers.add_parser("backfill_reva_ids")

    args = parser.parse_args()

    if args.command == "create_staff":
        print(f"Creating staff account for {args.phone}...")
        asyncio.run(create_staff_account(args.phone, args.name, args.password, args.admin))
    elif args.command == "backfill_reva_ids":
        asyncio.run(backfill_reva_ids())
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
