from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import date, datetime


# --- Category ---

class CategoryBase(BaseModel):
    name: str
    color: str = "#6366f1"

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class CategoryOut(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Habit ---

class HabitBase(BaseModel):
    name: str
    description: str = ""
    mode: str = "binary"
    goal_value: Optional[float] = None
    goal_unit: Optional[str] = None
    category_id: Optional[int] = None
    schedule_type: str = "daily"
    schedule_params: dict = {}
    reminder_time: Optional[str] = None
    order: int = 0

class HabitCreate(HabitBase):
    pass

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    goal_value: Optional[float] = None
    goal_unit: Optional[str] = None
    category_id: Optional[int] = None
    schedule_type: Optional[str] = None
    schedule_params: Optional[dict] = None
    reminder_time: Optional[str] = None
    is_active: Optional[bool] = None
    is_paused: Optional[bool] = None
    pause_start: Optional[date] = None
    pause_end: Optional[date] = None
    order: Optional[int] = None

class HabitOut(HabitBase):
    id: int
    is_active: bool
    is_paused: bool
    pause_start: Optional[date] = None
    pause_end: Optional[date] = None
    created_at: datetime
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True


# --- Entry ---

class EntryBase(BaseModel):
    habit_id: int
    date: date
    value: float = 1.0
    note: str = ""

class EntryCreate(EntryBase):
    pass

class EntryUpdate(BaseModel):
    value: Optional[float] = None
    note: Optional[str] = None

class EntryOut(EntryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Stats ---

class HabitStreak(BaseModel):
    habit_id: int
    current_streak: int
    longest_streak: int

class HabitStats(BaseModel):
    habit_id: int
    habit_name: str
    current_streak: int
    longest_streak: int
    completion_rate_week: float
    completion_rate_month: float
    total_completions: int
    momentum: int = 0

class HeatmapEntry(BaseModel):
    date: str
    count: int

class CalendarDay(BaseModel):
    date: str
    completed: bool
    value: Optional[float] = None
    note: Optional[str] = None
    paused: bool = False
    scheduled: bool = False
    failed: bool = False


# --- Insights ---

class WeekdayStat(BaseModel):
    weekday: int  # 0=Mon .. 6=Sun
    rate: float
    scheduled_count: int

class HabitWeakDay(BaseModel):
    habit_id: int
    habit_name: str
    weekday: int
    rate: float
    overall_rate: float

class CorrelationOut(BaseModel):
    habit_a_id: int
    habit_a_name: str
    habit_b_id: int
    habit_b_name: str
    phi: float
    p_b_given_a: float
    p_b_given_not_a: float
    shared_days: int

class DecliningHabit(BaseModel):
    habit_id: int
    habit_name: str
    momentum_now: int
    momentum_then: int
    drop: int

class InsightsOut(BaseModel):
    weekday: list[WeekdayStat] = []
    best_day: Optional[int] = None
    worst_day: Optional[int] = None
    habit_weak_days: list[HabitWeakDay] = []
    correlations: list[CorrelationOut] = []
    declining: list[DecliningHabit] = []


# --- Auth ---

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str


# --- Settings ---

class SettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_tls: Optional[bool] = None
    smtp_from: Optional[str] = None
    notification_email: Optional[str] = None
    backup_enabled: Optional[bool] = None
    backup_retention: Optional[int] = None
    backup_cron: Optional[str] = None
    daily_summary_time: Optional[str] = None
    daily_summary_enabled: Optional[bool] = None
    timezone: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

class SettingsOut(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_tls: bool
    smtp_from: str
    notification_email: str
    backup_enabled: bool
    backup_retention: int
    backup_cron: str
    daily_summary_time: str
    daily_summary_enabled: bool
    timezone: str
    username: str

    class Config:
        from_attributes = True


# --- Backup ---

class BackupInfo(BaseModel):
    filename: str
    size: int
    created_at: str
