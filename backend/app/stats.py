import calendar
from datetime import date, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from .models import Habit, Entry


def get_scheduled_dates(habit: Habit, start: date, end: date) -> List[date]:
    """Return dates when habit was scheduled between start and end inclusive."""
    result = []
    current = start
    stype = habit.schedule_type
    params = habit.schedule_params or {}

    # Precompute fixed sets (independent of the iterated date)
    weekly_x_days = None
    if stype == "weekly_x":
        # Distribute N sessions evenly across the week (Mon=0..Sun=6)
        times = max(1, min(7, int(params.get("times", 1))))
        step = 7 / times
        weekly_x_days = {int(i * step) for i in range(times)}
    weekly_days = set(params.get("days", [])) if stype == "weekly_days" else None

    while current <= end:
        scheduled = False
        if stype == "daily":
            scheduled = True
        elif stype == "weekly_x":
            scheduled = current.weekday() in weekly_x_days
        elif stype == "weekly_days":
            scheduled = current.weekday() in weekly_days
        elif stype == "monthly_x":
            # Distribute N sessions evenly across the month (1st of every step)
            days_in_month = calendar.monthrange(current.year, current.month)[1]
            times = max(1, min(days_in_month, int(params.get("times", 1))))
            step = days_in_month / times
            scheduled_days = {int(i * step) + 1 for i in range(times)}
            scheduled = current.day in scheduled_days

        if scheduled:
            result.append(current)
        current += timedelta(days=1)

    return result


def is_paused_on(habit: Habit, d: date) -> bool:
    if not habit.is_paused:
        return False
    ps = habit.pause_start
    pe = habit.pause_end
    if ps and pe:
        return ps <= d <= pe
    if ps:
        return d >= ps
    if pe:
        return d <= pe
    # Paused with no dates → indefinite freeze while is_paused is set
    return True


def compute_streak(habit: Habit, entries: List[Entry], today: date) -> tuple[int, int]:
    """Returns (current_streak, longest_streak)."""
    entry_dates = {e.date for e in entries if e.value > 0}

    creation_start = habit.created_at.date() if habit.created_at else today - timedelta(days=365)
    earliest_entry = min(entry_dates) if entry_dates else creation_start
    start = min(creation_start, earliest_entry)
    all_scheduled = get_scheduled_dates(habit, start, today)

    # Current streak: walk backwards; today not yet done is skipped (no penalty)
    streak = 0
    for d in reversed(all_scheduled):
        if is_paused_on(habit, d):
            continue
        if d in entry_dates:
            streak += 1
        elif d == today:
            continue  # today still pending — don't break streak
        else:
            break     # missed a past scheduled day — streak ends
    current = streak

    # Longest streak: walk forward
    streak = 0
    longest = 0
    for d in all_scheduled:
        if is_paused_on(habit, d):
            continue
        if d in entry_dates:
            streak += 1
            longest = max(longest, streak)
        elif d < today:
            streak = 0
    return current, longest


def completion_rate(habit: Habit, entries: List[Entry], start: date, end: date) -> float:
    entry_dates = {e.date for e in entries if e.value > 0}
    scheduled = [d for d in get_scheduled_dates(habit, start, end) if not is_paused_on(habit, d)]
    if not scheduled:
        return 0.0
    done = sum(1 for d in scheduled if d in entry_dates)
    return round(done / len(scheduled) * 100, 1)


def compute_momentum(habit: Habit, entries: List[Entry], today: date) -> int:
    """
    Triangular-number accumulation:
      each consecutive done day adds +N (N = length of current done run)
      each consecutive missed day subtracts -N (N = length of current miss run)
    Missing one day costs only -1; a long run of misses escalates quickly.
    Today is not penalised if not yet done.
    """
    entry_dates = {e.date for e in entries if e.value > 0}
    creation_start = habit.created_at.date() if habit.created_at else today - timedelta(days=365)
    earliest_entry = min(entry_dates) if entry_dates else creation_start
    start = min(creation_start, earliest_entry)
    all_scheduled = get_scheduled_dates(habit, start, today)

    momentum = 0
    consecutive_done = 0
    consecutive_missed = 0

    for d in all_scheduled:
        if is_paused_on(habit, d):
            continue
        if d in entry_dates:
            consecutive_done += 1
            consecutive_missed = 0
            momentum += consecutive_done
        elif d < today:          # past scheduled day not done = missed
            consecutive_missed += 1
            consecutive_done = 0
            momentum -= consecutive_missed
        # today not yet done → pending, no penalty

    return momentum


def get_momentum_history(habit: Habit, entries: List[Entry], today: date, days: int = 90) -> List[Dict]:
    """Return daily momentum value for the last `days` days."""
    entry_dates = {e.date for e in entries if e.value > 0}
    creation_start = habit.created_at.date() if habit.created_at else today - timedelta(days=365)
    earliest_entry = min(entry_dates) if entry_dates else creation_start
    start = min(creation_start, earliest_entry)
    all_scheduled = get_scheduled_dates(habit, start, today)

    # Replay algorithm, recording momentum after each scheduled day
    momentum = 0
    consecutive_done = 0
    consecutive_missed = 0
    momentum_at: Dict[date, int] = {}

    for d in all_scheduled:
        if is_paused_on(habit, d):
            momentum_at[d] = momentum
            continue
        if d in entry_dates:
            consecutive_done += 1
            consecutive_missed = 0
            momentum += consecutive_done
        elif d < today:
            consecutive_missed += 1
            consecutive_done = 0
            momentum -= consecutive_missed
        momentum_at[d] = momentum

    # Build a daily series; non-scheduled days carry the last known value
    result_start = today - timedelta(days=days - 1)
    result = []
    last_val = 0

    for i in range(days):
        d = result_start + timedelta(days=i)
        if d > today:
            break
        if d in momentum_at:
            last_val = momentum_at[d]
        result.append({"date": d.isoformat(), "momentum": last_val})

    return result


def get_heatmap(habit_id: int, db: Session, year: int) -> List[Dict]:
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    entries = (
        db.query(Entry)
        .filter(Entry.habit_id == habit_id, Entry.date >= start, Entry.date <= end)
        .all()
    )
    result = {}
    for e in entries:
        if e.value > 0:
            key = e.date.isoformat()
            result[key] = result.get(key, 0) + 1
    return [{"date": k, "count": v} for k, v in sorted(result.items())]


def get_all_habits_heatmap(db: Session, year: int) -> List[Dict]:
    """Aggregate heatmap across all active habits."""
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    entries = (
        db.query(Entry)
        .join(Habit)
        .filter(Habit.is_active == True, Entry.date >= start, Entry.date <= end)
        .all()
    )
    result = {}
    for e in entries:
        if e.value > 0:
            key = e.date.isoformat()
            result[key] = result.get(key, 0) + 1
    return [{"date": k, "count": v} for k, v in sorted(result.items())]
