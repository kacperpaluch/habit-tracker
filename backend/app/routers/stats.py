from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from ..database import get_db
from ..models import Habit, Entry
from ..schemas import HabitStats, HeatmapEntry, CalendarDay
from ..auth import get_current_user
from .. import stats as stats_lib

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/all-habits", response_model=List[HabitStats])
def all_habits_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Return stats for all active habits in a single request."""
    habits = db.query(Habit).filter(Habit.is_active == True).all()
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    result = []
    for habit in habits:
        entries = db.query(Entry).filter(Entry.habit_id == habit.id).all()
        current_streak, longest_streak = stats_lib.compute_streak(habit, entries, today)
        rate_week = stats_lib.completion_rate(habit, entries, week_start, today)
        rate_month = stats_lib.completion_rate(habit, entries, month_start, today)
        momentum = stats_lib.compute_momentum(habit, entries, today)
        result.append(HabitStats(
            habit_id=habit.id,
            habit_name=habit.name,
            current_streak=current_streak,
            longest_streak=longest_streak,
            completion_rate_week=rate_week,
            completion_rate_month=rate_month,
            total_completions=len(entries),
            momentum=momentum,
        ))
    return result


@router.get("/habits/{habit_id}", response_model=HabitStats)
def habit_stats(habit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(404, "Habit not found")

    entries = db.query(Entry).filter(Entry.habit_id == habit_id).all()
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    current_streak, longest_streak = stats_lib.compute_streak(habit, entries, today)
    rate_week = stats_lib.completion_rate(habit, entries, week_start, today)
    rate_month = stats_lib.completion_rate(habit, entries, month_start, today)
    momentum = stats_lib.compute_momentum(habit, entries, today)

    return HabitStats(
        habit_id=habit_id,
        habit_name=habit.name,
        current_streak=current_streak,
        longest_streak=longest_streak,
        completion_rate_week=rate_week,
        completion_rate_month=rate_month,
        total_completions=len(entries),
        momentum=momentum,
    )


@router.get("/momentum/{habit_id}")
def habit_momentum_history(
    habit_id: int,
    days: int = Query(default=90, ge=7, le=365),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(404, "Habit not found")
    entries = db.query(Entry).filter(Entry.habit_id == habit_id).all()
    today = date.today()
    return stats_lib.get_momentum_history(habit, entries, today, days)


@router.get("/heatmap", response_model=List[HeatmapEntry])
def all_heatmap(year: int = Query(default=None), db: Session = Depends(get_db), _=Depends(get_current_user)):
    if year is None:
        year = date.today().year
    return stats_lib.get_all_habits_heatmap(db, year)


@router.get("/heatmap/{habit_id}", response_model=List[HeatmapEntry])
def habit_heatmap(habit_id: int, year: int = Query(default=None), db: Session = Depends(get_db), _=Depends(get_current_user)):
    if year is None:
        year = date.today().year
    return stats_lib.get_heatmap(habit_id, db, year)


@router.get("/calendar/{habit_id}", response_model=List[CalendarDay])
def habit_calendar(
    habit_id: int,
    year: int = Query(default=None),
    month: int = Query(default=None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(404, "Habit not found")

    today = date.today()
    y = year or today.year
    m = month or today.month

    import calendar
    last_day = calendar.monthrange(y, m)[1]
    start = date(y, m, 1)
    end = date(y, m, last_day)

    entries = {
        e.date: e
        for e in db.query(Entry).filter(Entry.habit_id == habit_id, Entry.date >= start, Entry.date <= end).all()
    }
    scheduled = set(stats_lib.get_scheduled_dates(habit, start, end))

    result = []
    current = start
    while current <= end:
        entry = entries.get(current)
        paused = stats_lib.is_paused_on(habit, current)
        result.append(CalendarDay(
            date=current.isoformat(),
            completed=bool(entry) and (entry.value > 0 if entry else False),
            value=entry.value if entry else None,
            note=entry.note if entry else None,
            paused=paused,
            scheduled=current in scheduled,
        ))
        current += timedelta(days=1)

    return result


@router.get("/summary")
def daily_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Returns today's completion status for all active habits."""
    today = date.today()
    habits = db.query(Habit).filter(Habit.is_active == True).all()
    entries_today = {
        e.habit_id: e
        for e in db.query(Entry).filter(Entry.date == today, Entry.value > 0).all()
    }

    total = 0
    done = 0
    result = []
    for h in habits:
        if stats_lib.is_paused_on(h, today):
            continue
        scheduled = stats_lib.get_scheduled_dates(h, today, today)
        if not scheduled:
            continue
        total += 1
        entry = entries_today.get(h.id)
        completed = bool(entry)
        if completed:
            done += 1
        result.append({
            "habit_id": h.id,
            "name": h.name,
            "completed": completed,
            "value": entry.value if entry else None,
            "goal_value": h.goal_value,
            "mode": h.mode,
        })

    return {
        "date": today.isoformat(),
        "total": total,
        "done": done,
        "rate": round(done / total * 100, 1) if total else 0,
        "habits": result,
    }
