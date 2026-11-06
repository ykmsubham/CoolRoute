"""Razorpay checkout for sponsoring water / rest points.

With RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET set, this creates real orders through
Razorpay's Orders API and verifies the checkout signature server-side
(HMAC-SHA256 of "order_id|payment_id" with the key secret).

Without keys it runs in MOCK mode so the demo works offline. Mock payments are
flagged in the database and are never counted as real money in any report.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets

from . import config


def is_live() -> bool:
    return bool(config.RAZORPAY_KEY_ID and config.RAZORPAY_KEY_SECRET)


def create_order(amount_inr: int, receipt: str) -> dict:
    if not is_live():
        return {"id": f"order_mock_{secrets.token_hex(6)}", "amount": amount_inr * 100,
                "currency": "INR", "mock": True}
    import httpx

    r = httpx.post(
        "https://api.razorpay.com/v1/orders",
        auth=(config.RAZORPAY_KEY_ID, config.RAZORPAY_KEY_SECRET),
        json={"amount": amount_inr * 100, "currency": "INR", "receipt": receipt[:40]},
        timeout=15,
    )
    r.raise_for_status()
    return {**r.json(), "mock": False}


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not is_live():
        return payment_id.startswith("pay_mock_") and order_id.startswith("order_mock_")
    expected = hmac.new(
        config.RAZORPAY_KEY_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
