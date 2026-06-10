from datetime import date, timedelta
from typing import Dict, List, Set, Tuple
from sqlalchemy.orm import Session
from .models import Habit, Entry
from .stats import get_scheduled_dates, is_paused_on, build_day_status, get_momentum_history

WINDOW_DAYS = 90
MIN_WEEKDAY_SAMPLES = 4
MIN_HABIT_WEEKDAY_SAMPLES = 3
MIN_SHARED_DAYS = 20
MIN_PHI = 0.35
MIN_MOMENTUM_DROP = 5
DECLINE_LOOKBACK_DAYS = 21


def compute_insights(db: Session) -> Dict:
    today = date.today()
    start = today - timedelta(days=WINDOW_DAYS - 1)
    habits = db.query(Habit).filter(Habit.is_active == True).all()

    habit_data: List[Tuple[Habit, Set[date], Set[date]]] = []
    for h in habits:
        entries = db.query(Entry).filter(Entry.habit_id == h.id, Entry.date >= start).all()
        scheduled = get_scheduled_dates(h, start, today)
        done, failed = build_day_status(h, entries, scheduled, today)
        habit_data.append((h, done, failed))

    return {
        **_weekday_insights(habit_data),
        "habit_weak_days": _habit_weak_days(habit_data),
        "correlations": _correlations(habit_data),
        "declining": _declining(db, habits, today),
    }


def _weekday_insights(habit_data) -> Dict:
    sched_by_wd = [0] * 7
    done_by_wd = [0] * 7
    for _, done, failed in habit_data:
        for d in done:
            done_by_wd[d.weekday()] += 1
            sched_by_wd[d.weekday()] += 1
        for d in failed:
            sched_by_wd[d.weekday()] += 1

    weekday = [
        {
            "weekday": wd,
            "rate": round(done_by_wd[wd] / sched_by_wd[wd] * 100, 1),
            "scheduled_count": sched_by_wd[wd],
        }
        for wd in range(7)
        if sched_by_wd[wd] >= MIN_WEEKDAY_SAMPLES
    ]

    best_day = worst_day = None
    if len(weekday) >= 2:
        rates = [w["rate"] for w in weekday]
        if max(rates) > min(rates):
            best_day = max(weekday, key=lambda w: w["rate"])["weekday"]
            worst_day = min(weekday, key=lambda w: w["rate"])["weekday"]

    return {"weekday": weekday, "best_day": best_day, "worst_day": worst_day}


def _habit_weak_days(habit_data) -> List[Dict]:
    result = []
    for h, done, failed in habit_data:
        considered = done | failed
        weekdays = {d.weekday() for d in considered}
        if len(weekdays) < 3 or len(considered) < 10:
            continue
        overall = len(done) / len(considered) * 100

        worst_wd = None
        worst_rate = None
        for wd in weekdays:
            days = [d for d in considered if d.weekday() == wd]
            if len(days) < MIN_HABIT_WEEKDAY_SAMPLES:
                continue
            rate = sum(1 for d in days if d in done) / len(days) * 100
            if worst_rate is None or rate < worst_rate:
                worst_wd, worst_rate = wd, rate

        if worst_wd is not None and worst_rate < overall - 20:
            result.append({
                "habit_id": h.id,
                "habit_name": h.name,
                "weekday": worst_wd,
                "rate": round(worst_rate, 1),
                "overall_rate": round(overall, 1),
            })
    return result


def _correlations(habit_data) -> List[Dict]:
    result = []
    for i in range(len(habit_data)):
        for j in range(i + 1, len(habit_data)):
            ha, done_a, failed_a = habit_data[i]
            hb, done_b, failed_b = habit_data[j]
            shared = (done_a | failed_a) & (done_b | failed_b)
            n = len(shared)
            if n < MIN_SHARED_DAYS:
                continue

            n11 = sum(1 for d in shared if d in done_a and d in done_b)
            n10 = sum(1 for d in shared if d in done_a and d not in done_b)
            n01 = sum(1 for d in shared if d not in done_a and d in done_b)
            n00 = n - n11 - n10 - n01

            denom = ((n11 + n10) * (n01 + n00) * (n11 + n01) * (n10 + n00)) ** 0.5
            if denom == 0:
                continue
            phi = (n11 * n00 - n10 * n01) / denom
            if abs(phi) < MIN_PHI:
                continue

            a_done = n11 + n10
            a_not = n01 + n00
            result.append({
                "habit_a_id": ha.id,
                "habit_a_name": ha.name,
                "habit_b_id": hb.id,
                "habit_b_name": hb.name,
                "phi": round(phi, 2),
                "p_b_given_a": round(n11 / a_done * 100, 1) if a_done else 0.0,
                "p_b_given_not_a": round(n01 / a_not * 100, 1) if a_not else 0.0,
                "shared_days": n,
            })
    result.sort(key=lambda c: abs(c["phi"]), reverse=True)
    return result[:5]


def _declining(db: Session, habits: List[Habit], today: date) -> List[Dict]:
    result = []
    for h in habits:
        if is_paused_on(h, today):
            continue
        entries = db.query(Entry).filter(Entry.habit_id == h.id).all()
        hist = get_momentum_history(h, entries, today, days=DECLINE_LOOKBACK_DAYS + 1)
        if len(hist) < DECLINE_LOOKBACK_DAYS + 1:
            continue
        then = hist[0]["momentum"]
        now = hist[-1]["momentum"]
        if then - now >= MIN_MOMENTUM_DROP:
            result.append({
                "habit_id": h.id,
                "habit_name": h.name,
                "momentum_now": now,
                "momentum_then": then,
                "drop": then - now,
            })
    result.sort(key=lambda d: d["drop"], reverse=True)
    return result
