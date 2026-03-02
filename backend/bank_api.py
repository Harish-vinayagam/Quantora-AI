"""
bank_api.py — Simulated Bank Core-Banking API Connector
========================================================

Simulates a realistic connection to a bank's Core-Banking System (CBS)
via the ISO 20022-style transaction feed.  In production this module would
call the bank's secure REST/gRPC API using mTLS + OAuth 2.0 client-
credentials.  For the demo it generates realistic banking transactions
with proper IBAN formatting, SWIFT/BIC codes, merchant metadata, and
geo-tagging.

Architecture:
    ┌──────────────────┐         ┌──────────────────┐
    │  Core-Banking    │  REST   │   bank_api.py    │
    │  System (CBS)    │ ──────▶ │   Connector      │
    │                  │  mTLS   │                  │
    │  ISO 20022 Feed  │         │  poll_bank()     │
    └──────────────────┘         └──────┬───────────┘
                                        │
                                 ┌──────▼───────────┐
                                 │   SAGRA Engine    │
                                 │   (sentinel.py)   │
                                 └──────────────────┘
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import List, Optional


# ─────────────────────────────────────────────────────
# Bank Account Registry (simulated CBS customer file)
# ─────────────────────────────────────────────────────

@dataclass
class BankAccount:
    """Mirrors a real bank customer account record."""
    account_id: str          # Internal Quantora ID (A001, B001 …)
    iban: str                # ISO 13616 IBAN
    bic: str                 # SWIFT/BIC code
    holder_name: str
    account_type: str        # PERSONAL | BUSINESS | CORPORATE
    country: str             # ISO 3166 alpha-2
    currency: str            # ISO 4217
    branch_code: str
    risk_flag: bool = False  # Pre-flagged by the bank's KYC system


ACCOUNT_REGISTRY: dict[str, BankAccount] = {
    # ── Flagged / High-Risk Accounts ──
    "A001": BankAccount("A001", "GB29 NWBK 6016 1331 9268 19", "NWBKGB2L", "Mikhail Volkov",       "CORPORATE", "GB", "GBP", "NWBK-LON-001", risk_flag=True),
    "A002": BankAccount("A002", "CH93 0076 2011 6238 5295 7",  "UBSWCHZH", "Dragonfly Holdings SA", "CORPORATE", "CH", "CHF", "UBS-ZRH-042",  risk_flag=True),
    "A003": BankAccount("A003", "CY17 0020 0128 0000 0012 0052 7600", "BCYPCY2N", "Omega Ventures Ltd", "BUSINESS", "CY", "EUR", "BOC-LIM-007", risk_flag=True),
    "A004": BankAccount("A004", "AE07 0331 2345 6789 0123 456", "BOABORAC", "Al-Rashid Trading FZE", "CORPORATE", "AE", "AED", "ADCB-DXB-031", risk_flag=True),
    "A005": BankAccount("A005", "SG55 OCBC 1234 5678 9012 3456 789", "OCBCSGSG", "Jade Rivers Pte Ltd", "CORPORATE", "SG", "SGD", "OCBC-SIN-019", risk_flag=True),

    # ── Normal / Low-Risk Accounts ──
    "B001": BankAccount("B001", "DE89 3704 0044 0532 0130 00", "COBADEFF", "Hannah Müller",    "PERSONAL",  "DE", "EUR", "COBA-FRA-101"),
    "B002": BankAccount("B002", "FR76 3000 6000 0112 3456 7890 189", "BNPAFRPP", "Pierre Dubois",  "PERSONAL",  "FR", "EUR", "BNP-PAR-205"),
    "B003": BankAccount("B003", "US12 3456 7890 1234 5678 9012 345", "CITIUS33", "Sarah Johnson",  "PERSONAL",  "US", "USD", "CITI-NYC-312"),
    "B004": BankAccount("B004", "JP12 1234 1234 1234 1234 123", "MABORJPJ", "Yuki Tanaka",     "BUSINESS",  "JP", "JPY", "MUFG-TYO-044"),
    "B005": BankAccount("B005", "AU12 3456 7890 1234 5678 90", "ANZBAU3M", "James Williams",  "PERSONAL",  "AU", "AUD", "ANZ-SYD-078"),
    "B006": BankAccount("B006", "CA12 3456 7890 1234 56", "ROYCCAT2", "Emily Chen",       "PERSONAL",  "CA", "CAD", "RBC-TOR-156"),
    "B007": BankAccount("B007", "IN12 3456 7890 1234 5678 90", "HABORBBI", "Rajesh Kumar",    "BUSINESS",  "IN", "INR", "HDFC-MUM-211"),
    "B008": BankAccount("B008", "BR15 0000 0000 0000 1093 2840 814 P 2", "BRASBRRJ", "Lucas Silva", "PERSONAL", "BR", "BRL", "BRAD-SAO-045"),
    "C001": BankAccount("C001", "NL91 ABNA 0417 1643 00", "ABNANL2A", "Van der Berg BV",  "BUSINESS",  "NL", "EUR", "ABN-AMS-019"),
    "C002": BankAccount("C002", "SE35 5000 0000 0549 1000 0003", "ESSESESS", "Nordström & Co AB", "CORPORATE", "SE", "SEK", "SEB-STO-077"),
    "C003": BankAccount("C003", "HK12 3456 7890 1234 5678 90", "HABORHKH", "Li Wei International", "BUSINESS", "HK", "HKD", "HSBC-HKG-403"),
}


# ─────────────────────────────────────────────────────
# Transaction Templates (simulated CBS channel types)
# ─────────────────────────────────────────────────────

TRANSACTION_CHANNELS = [
    "SWIFT-gpi",       # International wire
    "SEPA-SCT",        # EU Single Euro Payments Area
    "RTGS",            # Real-Time Gross Settlement
    "ACH-BATCH",       # Automated Clearing House
    "INTERNAL",        # Intra-bank
    "CARD-CNP",        # Card-not-present (online)
    "CARD-POS",        # Point of Sale
    "API-OPEN-BANK",   # Open Banking / PSD2
]

MERCHANT_CATEGORIES = [
    ("MCC-5411", "Grocery"),
    ("MCC-5812", "Restaurant"),
    ("MCC-4829", "Wire Transfer"),
    ("MCC-6012", "Financial Institution"),
    ("MCC-7995", "Gambling"),
    ("MCC-5944", "Jewelry"),
    ("MCC-5732", "Electronics"),
    ("MCC-4722", "Travel Agency"),
    ("MCC-5999", "Miscellaneous Retail"),
    ("MCC-6211", "Securities & Commodities"),
]

GEO_LOCATIONS = [
    {"city": "London", "country": "GB", "lat": 51.5074, "lon": -0.1278},
    {"city": "Zurich", "country": "CH", "lat": 47.3769, "lon": 8.5417},
    {"city": "New York", "country": "US", "lat": 40.7128, "lon": -74.0060},
    {"city": "Singapore", "country": "SG", "lat": 1.3521, "lon": 103.8198},
    {"city": "Dubai", "country": "AE", "lat": 25.2048, "lon": 55.2708},
    {"city": "Tokyo", "country": "JP", "lat": 35.6762, "lon": 139.6503},
    {"city": "Frankfurt", "country": "DE", "lat": 50.1109, "lon": 8.6821},
    {"city": "Hong Kong", "country": "HK", "lat": 22.3193, "lon": 114.1694},
    {"city": "Paris", "country": "FR", "lat": 48.8566, "lon": 2.3522},
    {"city": "São Paulo", "country": "BR", "lat": -23.5505, "lon": -46.6333},
    {"city": "Mumbai", "country": "IN", "lat": 19.0760, "lon": 72.8777},
    {"city": "Toronto", "country": "CA", "lat": 43.6532, "lon": -79.3832},
    {"city": "Sydney", "country": "AU", "lat": -33.8688, "lon": 151.2093},
    {"city": "Limassol", "country": "CY", "lat": 34.7071, "lon": 33.0226},
    {"city": "Amsterdam", "country": "NL", "lat": 52.3676, "lon": 4.9041},
]


# ─────────────────────────────────────────────────────
# Bank Transaction Model (ISO 20022 pain.001 style)
# ─────────────────────────────────────────────────────

@dataclass
class BankTransaction:
    """Mirrors a real bank CBS transaction record (ISO 20022 format)."""
    message_id: str                 # Bank's unique message identifier
    instruction_id: str             # Payment instruction ID
    end_to_end_id: str              # End-to-end tracking ID
    creation_datetime: str          # ISO 8601 timestamp
    channel: str                    # SWIFT-gpi, SEPA-SCT, RTGS …
    debtor_account_id: str          # Internal account ID (maps to Quantora)
    debtor_iban: str
    debtor_bic: str
    debtor_name: str
    creditor_account_id: str
    creditor_iban: str
    creditor_bic: str
    creditor_name: str
    amount: float
    currency: str
    merchant_category: str          # MCC code
    merchant_label: str
    originator_country: str
    beneficiary_country: str
    geo: dict                       # Originating location
    remittance_info: str            # Payment reference / description
    batch_id: str                   # CBS batch identifier
    bank_risk_flag: bool            # Pre-screening flag from the bank


# ─────────────────────────────────────────────────────
# Bank API Connection State
# ─────────────────────────────────────────────────────

@dataclass
class BankConnectionStatus:
    connected: bool = True
    bank_name: str = "National Reserve Bank (NRB)"
    api_version: str = "v3.2.1"
    protocol: str = "REST / mTLS + OAuth 2.0"
    feed_type: str = "ISO 20022 pain.001 (Real-Time)"
    last_poll: Optional[str] = None
    total_ingested: int = 0
    uptime_seconds: float = 0
    latency_ms: float = 0
    error_count: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


# Singleton connection state
connection_status = BankConnectionStatus()
_startup_time: Optional[datetime] = None


# ─────────────────────────────────────────────────────
# Raw bank feed buffer (pre-SAGRA)
# ─────────────────────────────────────────────────────

raw_bank_feed: List[dict] = []
_MAX_RAW_FEED = 200


# ─────────────────────────────────────────────────────
# Core: Generate a realistic bank transaction
# ─────────────────────────────────────────────────────

def _generate_bank_transaction() -> BankTransaction:
    """
    Simulate polling the bank's CBS API and receiving a single
    transaction record in ISO 20022 format.
    """
    account_ids = list(ACCOUNT_REGISTRY.keys())

    # Weighted selection — fraud accounts are less common but present
    fraud_ids = [k for k, v in ACCOUNT_REGISTRY.items() if v.risk_flag]
    normal_ids = [k for k, v in ACCOUNT_REGISTRY.items() if not v.risk_flag]

    # ~25% chance the sender is a flagged account (for demo purposes)
    if random.random() < 0.25:
        sender_id = random.choice(fraud_ids)
    else:
        sender_id = random.choice(normal_ids)

    # Receiver is always different from sender
    receiver_id = random.choice([aid for aid in account_ids if aid != sender_id])

    sender = ACCOUNT_REGISTRY[sender_id]
    receiver = ACCOUNT_REGISTRY[receiver_id]

    # Amount distribution
    is_suspicious = sender.risk_flag
    if is_suspicious and random.random() > 0.4:
        # Suspicious: higher amounts
        amount = round(random.uniform(5000, 75000), 2)
    else:
        amount = round(random.uniform(50, 5000), 2)

    # Channel selection
    if amount > 20000:
        channel = random.choice(["SWIFT-gpi", "RTGS"])
    elif amount > 5000:
        channel = random.choice(["SWIFT-gpi", "SEPA-SCT", "RTGS", "ACH-BATCH"])
    else:
        channel = random.choice(TRANSACTION_CHANNELS)

    # Merchant category
    mcc_code, mcc_label = random.choice(MERCHANT_CATEGORIES)
    if is_suspicious:
        # Suspicious accounts tend toward financial / wire categories
        mcc_code, mcc_label = random.choice([
            ("MCC-4829", "Wire Transfer"),
            ("MCC-6012", "Financial Institution"),
            ("MCC-6211", "Securities & Commodities"),
            ("MCC-7995", "Gambling"),
        ])

    # Geolocation
    sender_geo_candidates = [g for g in GEO_LOCATIONS if g["country"] == sender.country]
    geo = random.choice(sender_geo_candidates) if sender_geo_candidates else random.choice(GEO_LOCATIONS)

    # Remittance info
    remittance_options = [
        f"INV-{random.randint(100000, 999999)}",
        f"PO-{random.randint(10000, 99999)}",
        f"SALARY-{datetime.now(timezone.utc).strftime('%Y%m')}",
        f"TRANSFER-{uuid.uuid4().hex[:8].upper()}",
        "LOAN REPAYMENT",
        "CONSULTANCY FEE",
        "TRADE SETTLEMENT",
        f"REF/{random.randint(1000, 9999)}/{datetime.now(timezone.utc).strftime('%d%m%Y')}",
    ]

    now = datetime.now(timezone.utc)
    batch_id = f"NRB-BATCH-{now.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    return BankTransaction(
        message_id=f"NRB-MSG-{uuid.uuid4().hex[:12].upper()}",
        instruction_id=f"INSTR-{uuid.uuid4().hex[:10].upper()}",
        end_to_end_id=f"E2E-{uuid.uuid4().hex[:16].upper()}",
        creation_datetime=now.isoformat(),
        channel=channel,
        debtor_account_id=sender_id,
        debtor_iban=sender.iban,
        debtor_bic=sender.bic,
        debtor_name=sender.holder_name,
        creditor_account_id=receiver_id,
        creditor_iban=receiver.iban,
        creditor_bic=receiver.bic,
        creditor_name=receiver.holder_name,
        amount=amount,
        currency=sender.currency,
        merchant_category=mcc_code,
        merchant_label=mcc_label,
        originator_country=sender.country,
        beneficiary_country=receiver.country,
        geo=geo,
        remittance_info=random.choice(remittance_options),
        batch_id=batch_id,
        bank_risk_flag=sender.risk_flag,
    )


# ─────────────────────────────────────────────────────
# Public API: Poll the bank feed
# ─────────────────────────────────────────────────────

def init_bank_connection():
    """Initialize the simulated bank connection on startup."""
    global _startup_time
    _startup_time = datetime.now(timezone.utc)
    connection_status.connected = True
    connection_status.last_poll = _startup_time.isoformat()
    connection_status.total_ingested = 0
    connection_status.error_count = 0


def poll_bank_transactions(count: int = 1) -> List[BankTransaction]:
    """
    Poll the bank's CBS feed and return `count` new transactions.

    In production this would be:
        GET https://nrb-cbs.bank/api/v3/transactions/feed
        Authorization: Bearer <oauth2_token>
        X-Request-ID: <uuid>
        Accept: application/json; charset=utf-8
    """
    global _startup_time

    txns: List[BankTransaction] = []
    for _ in range(count):
        tx = _generate_bank_transaction()
        txns.append(tx)

        # Store raw feed (pre-SAGRA) for audit trail
        raw_record = asdict(tx)
        raw_record["sagra_processed"] = False
        raw_bank_feed.insert(0, raw_record)

    # Trim raw feed buffer
    while len(raw_bank_feed) > _MAX_RAW_FEED:
        raw_bank_feed.pop()

    # Update connection status
    now = datetime.now(timezone.utc)
    connection_status.last_poll = now.isoformat()
    connection_status.total_ingested += count
    connection_status.latency_ms = round(random.uniform(12, 85), 1)
    if _startup_time:
        connection_status.uptime_seconds = round(
            (now - _startup_time).total_seconds(), 1
        )

    return txns


def get_connection_status() -> dict:
    """Return the current bank API connection status."""
    return connection_status.to_dict()


def get_raw_feed(limit: int = 50) -> List[dict]:
    """Return raw bank transactions (pre-SAGRA) for audit display."""
    return raw_bank_feed[:limit]


def get_account_info(account_id: str) -> Optional[dict]:
    """Look up bank account details by internal ID."""
    acct = ACCOUNT_REGISTRY.get(account_id)
    if not acct:
        return None
    return asdict(acct)


def get_all_accounts() -> List[dict]:
    """Return all registered bank accounts."""
    return [asdict(a) for a in ACCOUNT_REGISTRY.values()]
