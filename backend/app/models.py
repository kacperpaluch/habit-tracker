from sqlalchemy import Column, Integer, String, Boolean, Float, Date, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#6366f1")
    icon = Column(String, default="tag")
    created_at = Column(DateTime, server_default=func.now())

    habits = relationship("Habit", back_populates="category")


class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    mode = Column(String, default="binary")  # binary | quantitative
    goal_value = Column(Float, nullable=True)
    goal_unit = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    # Schedule: daily | weekly_x | weekly_days | monthly_x
    schedule_type = Column(String, default="daily")
    schedule_params = Column(JSON, default=dict)  # {"times": 3} or {"days": [0,2,4]}

    time_of_day = Column(String, nullable=True)  # morning | afternoon | evening
    reminder_time = Column(String, nullable=True)  # HH:MM

    is_active = Column(Boolean, default=True)
    is_paused = Column(Boolean, default=False)
    pause_start = Column(Date, nullable=True)
    pause_end = Column(Date, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    order = Column(Integer, default=0)

    category = relationship("Category", back_populates="habits")
    entries = relationship("Entry", back_populates="habit", cascade="all, delete-orphan")


class Entry(Base):
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    value = Column(Float, default=1.0)  # 1.0 = done for binary; actual value for quantitative
    note = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    habit = relationship("Habit", back_populates="entries")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    username = Column(String, default="admin")
    hashed_password = Column(String, nullable=False)

    smtp_host = Column(String, default="")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String, default="")
    smtp_password = Column(String, default="")
    smtp_tls = Column(Boolean, default=True)
    smtp_from = Column(String, default="")
    notification_email = Column(String, default="")

    backup_enabled = Column(Boolean, default=True)
    backup_retention = Column(Integer, default=10)
    backup_cron = Column(String, default="0 4 * * *")

    daily_summary_time = Column(String, default="08:00")
    daily_summary_enabled = Column(Boolean, default=False)

    timezone = Column(String, default="UTC")
