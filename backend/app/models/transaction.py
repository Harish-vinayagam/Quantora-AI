"""Transaction model — stores SAGRA-scored transactions."""

from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    sender: Mapped[str] = mapped_column(String(20), index=True)
    receiver: Mapped[str] = mapped_column(String(20), index=True)
    amount: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    # SAGRA scores
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[str] = mapped_column(String(10), default="low")  # high, medium, low
    is_fraud: Mapped[bool] = mapped_column(Boolean, default=False)
    trs: Mapped[float] = mapped_column(Float, default=0.0)  # Transaction Risk Score
    grs: Mapped[float] = mapped_column(Float, default=0.0)  # Graph Risk Score
    ndb: Mapped[float] = mapped_column(Float, default=0.0)  # Neighbor Deviation Bias
    sender_degree: Mapped[float] = mapped_column(Float, default=0.0)

    # Optional metadata
    description: Mapped[str] = mapped_column(Text, default="")
    iban: Mapped[str] = mapped_column(String(34), default="")
    bic: Mapped[str] = mapped_column(String(11), default="")
    source: Mapped[str] = mapped_column(String(20), default="api")  # api, csv, manual, bank_feed

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "sender": self.sender,
            "receiver": self.receiver,
            "amount": self.amount,
            "timestamp": self.timestamp.isoformat() + "Z",
            "risk_score": round(self.risk_score, 4),
            "risk_level": self.risk_level,
            "is_fraud": self.is_fraud,
            "trs": round(self.trs, 4),
            "grs": round(self.grs, 4),
            "ndb": round(self.ndb, 4),
            "sender_degree": round(self.sender_degree, 4),
            "description": self.description,
            "source": self.source,
        }
