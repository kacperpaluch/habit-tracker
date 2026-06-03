import os
import json
import sqlite3
import logging
from datetime import datetime, date, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Settings, Habit, Entry
from . import stats as stats_lib
from .email import send_daily_reminder

logger = logging.getLogger(__name__)
BACKUP_DIR = os.getenv("BACKUP_DIR", "/backups")
DATA_DIR = os.getenv("DATA_DIR", "/data")

scheduler = AsyncIOScheduler()


def _get_db() -> Session:
    return SessionLocal()


async def run_daily_summary():
    db = _get_db()
    try:
        settings = db.query(Settings).first()
        if not settings or not settings.daily_summary_enabled:
            logger.info("Daily summary skipped: disabled in settings")
            return

        today = date.today()
        habits = db.query(Habit).filter(Habit.is_active == True).all()
        # Only count entries with value > 0 as "done"; value=0 (noted skip) should still trigger a reminder
        entries_done_today = {
            e.habit_id for e in db.query(Entry).filter(Entry.date == today, Entry.value > 0).all()
        }

        pending = []
        for h in habits:
            if stats_lib.is_paused_on(h, today):
                continue
            scheduled = stats_lib.get_scheduled_dates(h, today, today)
            if scheduled and h.id not in entries_done_today:
                pending.append({"name": h.name, "time_of_day": h.time_of_day})

        logger.info(f"Daily summary: {len(habits)} active habits, {len(pending)} pending, sending to {settings.notification_email}")
        if pending:
            await send_daily_reminder(settings, pending)
            logger.info("Daily summary email sent")
        else:
            logger.info("Daily summary: no pending habits, email skipped")
    except Exception as e:
        logger.error(f"Daily summary error: {e}", exc_info=True)
    finally:
        db.close()


async def run_backup():
    db = _get_db()
    try:
        settings = db.query(Settings).first()
        if not settings or not settings.backup_enabled:
            return

        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        src = os.path.join(DATA_DIR, "habits.db")
        dst = os.path.join(BACKUP_DIR, f"habits_{timestamp}.db")
        if os.path.exists(src):
            # Use SQLite's online backup API so the copy is consistent and
            # includes data still sitting in the WAL file (shutil.copy2 would not).
            src_conn = sqlite3.connect(src)
            dst_conn = sqlite3.connect(dst)
            try:
                with dst_conn:
                    src_conn.backup(dst_conn)
            finally:
                src_conn.close()
                dst_conn.close()
            logger.info(f"Backup created: {dst}")

        # Prune old backups
        retention = settings.backup_retention or 10
        backups = sorted([
            f for f in os.listdir(BACKUP_DIR) if f.startswith("habits_") and f.endswith(".db")
        ])
        while len(backups) > retention:
            old = backups.pop(0)
            os.remove(os.path.join(BACKUP_DIR, old))
            logger.info(f"Pruned old backup: {old}")
    except Exception as e:
        logger.error(f"Backup error: {e}")
    finally:
        db.close()


def setup_scheduler(app=None):
    db = _get_db()
    try:
        settings = db.query(Settings).first()
        tz = settings.timezone if settings else "UTC"
        summary_time = settings.daily_summary_time if settings else "08:00"
        backup_cron = settings.backup_cron if settings else "0 4 * * *"
    finally:
        db.close()

    h, m = summary_time.split(":")
    scheduler.add_job(
        run_daily_summary,
        CronTrigger(hour=int(h), minute=int(m), timezone=tz),
        id="daily_summary",
        replace_existing=True,
    )

    parts = backup_cron.split()
    scheduler.add_job(
        run_backup,
        CronTrigger(
            minute=parts[0], hour=parts[1], day=parts[2],
            month=parts[3], day_of_week=parts[4], timezone=tz,
        ),
        id="auto_backup",
        replace_existing=True,
    )

    if not scheduler.running:
        scheduler.start()


def reschedule(settings: Settings):
    tz = settings.timezone or "UTC"
    h, m = (settings.daily_summary_time or "08:00").split(":")
    scheduler.add_job(
        run_daily_summary,
        CronTrigger(hour=int(h), minute=int(m), timezone=tz),
        id="daily_summary",
        replace_existing=True,
    )
    parts = (settings.backup_cron or "0 4 * * *").split()
    scheduler.add_job(
        run_backup,
        CronTrigger(
            minute=parts[0], hour=parts[1], day=parts[2],
            month=parts[3], day_of_week=parts[4], timezone=tz,
        ),
        id="auto_backup",
        replace_existing=True,
    )
