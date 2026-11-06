from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .config import DATABASE_URL

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def _now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Sponsorship(Base):
    """A donation that funds upkeep of one water / rest point."""

    __tablename__ = "sponsorships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    point_id: Mapped[str] = mapped_column(String(32), index=True)
    amount_inr: Mapped[int] = mapped_column(Integer)
    donor_name: Mapped[str] = mapped_column(String(80), default="")
    order_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    payment_id: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(16), default="created")  # created | paid | failed
    mock: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class RouteQuery(Base):
    """Lightweight log of planning requests (useful for the demo + analytics)."""

    __tablename__ = "route_queries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    origin: Mapped[str] = mapped_column(String(32))
    dest: Mapped[str] = mapped_column(String(32))
    hour: Mapped[int] = mapped_column(Integer)
    scenario: Mapped[str] = mapped_column(String(80), default="Baseline")
    recommended: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


def init_db():
    Base.metadata.create_all(engine)


def get_session():
    with SessionLocal() as s:
        yield s


def raised_by_point(session: Session) -> dict[str, int]:
    rows = session.execute(
        select(Sponsorship.point_id, func.coalesce(func.sum(Sponsorship.amount_inr), 0))
        .where(Sponsorship.status == "paid")
        .group_by(Sponsorship.point_id)
    ).all()
    return {pid: int(total) for pid, total in rows}
