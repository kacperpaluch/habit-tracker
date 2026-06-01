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

    while current <= end:
        scheduled = False
        if stype == "daily":
            scheduled = True
        elif stype == "weekly_x":
            # Count Mon as start of week; schedule first N days per week
            # We spread evenly — just track week number
            week_start = current - timedelta(days=current.weekday())
            week_days = [week_start + timedelta(days=i) for i in range(7)]
            times = params.get("times", 1)
            scheduled = current in week_days[:times]
        elif stype == "weekly_days":
            # days is list of weekday ints: 0=Mon..6=Sun
            days = params.get("days", [])
            scheduled = current.weekday() in days
        elif stype == "monthly_x":
            times = params.get("times", 1)
            scheduled = current.day <= times

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
    return False


def compute_streak(habit: Habit, entries: List[Entry], today: date) -> tuple[int, int]:
    """Returns (current_streak, longest_streak)."""
    entry_dates = {e.date for e in entries}

    # Build list of scheduled dates from habit creation up to today
    start = habit.created_at.date() if habit.created_at else today - timedelta(days=365)
    all_scheduled = get_scheduled_dates(habit, start, today)

    current = 0
    longest = 0
    streak = 0
    # Walk backwards for current streak
    for d in reversed(all_scheduled):
        if is_paused_on(habit, d):
            continue  # paused days don't break streak
        if d in entry_dates:
            streak += 1
            if d == today or d == today - timedelta(days=1):
                current = streak
        else:
            if d < today:  # missed day in the past
                break
    # Longest streak: walk forward
    streak = 0
    for d in all_scheduled:
        if is_paused_on(habit, d):
            continue
        if d in entry_dates:
            streak += 1
            longest = max(longest, streak)
        else:
            if d < today:
                streak = 0
    return current, longest


def completion_rate(habit: Habit, entries: List[Entry], start: date, end: date) -> float:
    entry_dates = {e.date for e in entries}
    scheduled = [d for d in get_scheduled_dates(habit, start, end) if not is_paused_on(habit, d)]
    if not scheduled:
        return 0.0
    done = sum(1 for d in scheduled if d in entry_dates)
    return round(done / len(scheduled) * 100, 1)


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
        key = e.date.isoformat()
        result[key] = result.get(key, 0) + 1
    return [{"date": k, "count": v} for k, v in sorted(result.items())]
