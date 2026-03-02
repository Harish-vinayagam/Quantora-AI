"""BankConnection model — stores registered bank API connections."""

from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class BankConnection(Base):
    __tablename__ = "bank_connections"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    bank_name: Mapped[str] = mapped_column(String(100))
    api_key_masked: Mapped[str] = mapped_column(String(50))  # e.g. "sk-****7f2a"
    endpoint_url: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="connected")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "bank_name": self.bank_name,
            "api_key_masked": self.api_key_masked,
            "endpoint_url": self.endpoint_url,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z",
        }
