"""S3-compatible object storage service."""

import io
import logging
import uuid
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from PIL import Image
import base64
from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 10 * 1024 * 1024   # 10 MB input limit
TARGET_IMAGE_BYTES = 400 * 1024       # compress to < 400 KB for fast loading & storage
MAX_IMAGE_DIMENSION = 1280


def _s3_client():
    if not settings.storage_configured:
        return None
    return boto3.client(
        "s3",
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        endpoint_url=settings.S3_ENDPOINT_URL,
        region_name=settings.S3_REGION,
    )


def validate_and_compress_image(file_bytes: bytes, content_type: str) -> bytes:
    """Validate image type and size, compress if needed."""
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if content_type not in allowed_types:
        raise ValueError(f"Image type {content_type} not allowed. Use JPEG, PNG, or WebP.")

    if len(file_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(f"Image too large ({len(file_bytes) // 1024}KB). Maximum is 10MB.")

    img = Image.open(io.BytesIO(file_bytes))
    img = img.convert("RGB")

    # Resize if too large
    if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.LANCZOS)

    # Compress to target size
    output = io.BytesIO()
    quality = 85
    while quality > 30:
        output.seek(0)
        output.truncate(0)
        img.save(output, format="JPEG", quality=quality, optimize=True)
        if output.tell() <= TARGET_IMAGE_BYTES:
            break
        quality -= 10

    return output.getvalue()


async def upload_file(file_bytes: bytes, folder: str, content_type: str = "image/jpeg") -> dict:
    """Upload file to S3-compatible storage. Returns url and storage_key."""
    key = f"{folder}/{uuid.uuid4()}.jpg"

    if not settings.storage_configured:
        # Self-contained Data URL fallback when S3 is not configured
        b64_str = base64.b64encode(file_bytes).decode("utf-8")
        data_url = f"data:{content_type};base64,{b64_str}"
        logger.info("Storage not configured. Stored photo as direct data URL (size: %s bytes)", len(file_bytes))
        return {
            "url": data_url,
            "storage_key": key,
            "configured": True,
        }

    s3 = _s3_client()
    try:
        s3.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{key}"
        return {"url": url, "storage_key": key, "configured": True}
    except ClientError as exc:
        logger.exception("S3 upload failed: %s", exc)
        raise ValueError("File upload failed. Please try again.")


async def delete_file(storage_key: str) -> bool:
    """Delete a file from storage."""
    if not settings.storage_configured or not storage_key:
        return True
    s3 = _s3_client()
    try:
        s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=storage_key)
        return True
    except ClientError as exc:
        logger.exception("S3 delete failed: %s", exc)
        return False
