import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import engine, SessionLocal
from . import models
from .auth import hash_password
from .scheduler import setup_scheduler
from .routers import auth, categories, habits, entries, stats, settings, backup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")


def init_db():
    models.Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        existing = db.query(models.Settings).first()
        if not existing:
            default_password = os.getenv("ADMIN_PASSWORD", "changeme")
            default_username = os.getenv("ADMIN_USERNAME", "admin")
            s = models.Settings(
                id=1,
                username=default_username,
                hashed_password=hash_password(default_password),
                timezone=os.getenv("TZ", "UTC"),
                smtp_host=os.getenv("SMTP_HOST", ""),
                smtp_port=int(os.getenv("SMTP_PORT", "587")),
                smtp_user=os.getenv("SMTP_USER", ""),
                smtp_password=os.getenv("SMTP_PASSWORD", ""),
                smtp_tls=os.getenv("SMTP_TLS", "true").lower() == "true",
                smtp_from=os.getenv("SMTP_FROM", ""),
                notification_email=os.getenv("NOTIFICATION_EMAIL", ""),
            )
            db.add(s)
            db.commit()
            logger.info(f"Initialized DB with user '{default_username}'")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        setup_scheduler()
    except Exception as e:
        logger.warning(f"Scheduler setup warning: {e}")
    yield


app = FastAPI(title="Habit Tracker", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(habits.router)
app.include_router(entries.router)
app.include_router(stats.router)
app.include_router(settings.router)
app.include_router(backup.router)

# Serve frontend SPA
if os.path.isdir(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
