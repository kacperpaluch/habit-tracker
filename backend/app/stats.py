import calendar
from datetime import date, timedelta
from typing import List, Dict, Optional, Set, Tuple
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


def is_entry_done(habit: Habit, value: Optional[float]) -> bool:
    """Done semantics: binary → any value>0; quantitative/timed with a goal → goal reached."""
    if value is None or value <= 0:
        return False
    if habit.mode in ("quantitative", "timed") and habit.goal_value:
        return value >= habit.goal_value
    return True


def _history_start(habit: Habit, entries: List[Entry], today: date) -> date:
    creation = habit.created_at.date() if habit.created_at else today - timedelta(days=365)
    entry_dates = [e.date for e in entries]
    return min([creation] + entry_dates)


def build_day_status(habit: Habit, entries: List[Entry], scheduled: List[date], today: date) -> Tuple[Set[date], Set[date]]:
    """Classify scheduled days as done/failed; paused, future and pending-today days land in neither set.

    Days before the habit existed (creation date / earliest entry) are skipped for all modes.
    negative mode: a scheduled day without a slip entry counts as done (today included,
    optimistically); a slip (value>0) counts as failed.
    """
    value_by_date = {e.date: (e.value or 0) for e in entries}
    done: Set[date] = set()
    failed: Set[date] = set()
    first = _history_start(habit, entries, today)

    if habit.mode == "negative":
        for d in scheduled:
            if d > today or d < first or is_paused_on(habit, d):
                continue
            if value_by_date.get(d, 0) > 0:
                failed.add(d)
            else:
                done.add(d)
    else:
        for d in scheduled:
            if d > today or d < first or is_paused_on(habit, d):
                continue
            if is_entry_done(habit, value_by_date.get(d)):
                done.add(d)
            elif d < today:
                failed.add(d)
            # d == today and not done → pending, no penalty
    return done, failed


def compute_streak(habit: Habit, entries: List[Entry], today: date) -> tuple[int, int]:
    """Returns (current_streak, longest_streak)."""
    start = _history_start(habit, entries, today)
    all_scheduled = get_scheduled_dates(habit, start, today)
    done, failed = build_day_status(habit, entries, all_scheduled, today)

    # Current streak: walk backwards; days in neither set (paused/pending) are skipped
    streak = 0
    for d in reversed(all_scheduled):
        if d in done:
            streak += 1
        elif d in failed:
            break
    current = streak

    # Longest streak: walk forward
    streak = 0
    longest = 0
    for d in all_scheduled:
        if d in done:
            streak += 1
            longest = max(longest, streak)
        elif d in failed:
            streak = 0
    return current, longest


def completion_rate(habit: Habit, entries: List[Entry], start: date, end: date, today: Optional[date] = None) -> float:
    today = today or date.today()
    scheduled = get_scheduled_dates(habit, start, end)
    done, failed = build_day_status(habit, entries, scheduled, today)
    # A pending today still counts in the denominator (matches pre-existing behaviour)
    pending_today = 1 if (
        habit.mode != "negative"
        and today in scheduled
        and start <= today <= end
        and today not in done and today not in failed
        and not is_paused_on(habit, today)
    ) else 0
    total = len(done) + len(failed) + pending_today
    if not total:
        return 0.0
    return round(len(done) / total * 100, 1)


def compute_momentum(habit: Habit, entries: List[Entry], today: date) -> int:
    """
    Triangular-number accumulation:
      each consecutive done day adds +N (N = length of current done run)
      each consecutive missed day subtracts -N (N = length of current miss run)
    Missing one day costs only -1; a long run of misses escalates quickly.
    Today is not penalised if not yet done.
    """
    start = _history_start(habit, entries, today)
    all_scheduled = get_scheduled_dates(habit, start, today)
    done, failed = build_day_status(habit, entries, all_scheduled, today)

    momentum = 0
    consecutive_done = 0
    consecutive_missed = 0

    for d in all_scheduled:
        if d in done:
            consecutive_done += 1
            consecutive_missed = 0
            momentum += consecutive_done
        elif d in failed:
            consecutive_missed += 1
            consecutive_done = 0
            momentum -= consecutive_missed

    return momentum


def get_momentum_history(habit: Habit, entries: List[Entry], today: date, days: int = 90) -> List[Dict]:
    """Return daily momentum value for the last `days` days."""
    start = _history_start(habit, entries, today)
    all_scheduled = get_scheduled_dates(habit, start, today)
    done, failed = build_day_status(habit, entries, all_scheduled, today)

    # Replay algorithm, recording momentum after each scheduled day
    momentum = 0
    consecutive_done = 0
    consecutive_missed = 0
    momentum_at: Dict[date, int] = {}

    for d in all_scheduled:
        if d in done:
            consecutive_done += 1
            consecutive_missed = 0
            momentum += consecutive_done
        elif d in failed:
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


def count_completions(habit: Habit, entries: List[Entry], today: date) -> int:
    """Total done days over the habit's whole history (negative: clean days)."""
    if habit.mode == "negative":
        scheduled = get_scheduled_dates(habit, _history_start(habit, entries, today), today)
        done, _ = build_day_status(habit, entries, scheduled, today)
        return len(done)
    return sum(1 for e in entries if is_entry_done(habit, e.value))


def _habit_done_days(habit: Habit, entries: List[Entry], start: date, end: date, today: date) -> Set[date]:
    """Days within [start, end] that count as done for heatmap purposes."""
    if habit.mode == "negative":
        scheduled = get_scheduled_dates(habit, start, min(end, today))
        done, _ = build_day_status(habit, entries, scheduled, today)
        return done
    return {e.date for e in entries if is_entry_done(habit, e.value)}


def get_heatmap(habit_id: int, db: Session, year: int) -> List[Dict]:
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        return []
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    entries = (
        db.query(Entry)
        .filter(Entry.habit_id == habit_id, Entry.date >= start, Entry.date <= end)
        .all()
    )
    done = _habit_done_days(habit, entries, start, end, date.today())
    return [{"date": d.isoformat(), "count": 1} for d in sorted(done)]


def get_all_habits_heatmap(db: Session, year: int) -> List[Dict]:
    """Aggregate heatmap across all active habits."""
    start = date(year, 1, 1)
    end = date(year, 12, 31)
    today = date.today()
    habits = db.query(Habit).filter(Habit.is_active == True).all()
    counts: Dict[date, int] = {}
    for habit in habits:
        entries = (
            db.query(Entry)
            .filter(Entry.habit_id == habit.id, Entry.date >= start, Entry.date <= end)
            .all()
        )
        for d in _habit_done_days(habit, entries, start, end, today):
            counts[d] = counts.get(d, 0) + 1
    return [{"date": d.isoformat(), "count": v} for d, v in sorted(counts.items())]
