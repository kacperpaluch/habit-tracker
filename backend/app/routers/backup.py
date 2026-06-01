import os
import json
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Category, Habit, Entry, Settings
from ..schemas import BackupInfo
from ..auth import get_current_user

router = APIRouter(prefix="/api/backup", tags=["backup"])

BACKUP_DIR = os.getenv("BACKUP_DIR", "/backups")


def _export_data(db: Session) -> dict:
    cats = db.query(Category).all()
    habits = db.query(Habit).all()
    entries = db.query(Entry).all()

    return {
        "version": 1,
        "exported_at": datetime.utcnow().isoformat(),
        "categories": [
            {"id": c.id, "name": c.name, "color": c.color, "icon": c.icon}
            for c in cats
        ],
        "habits": [
            {
                "id": h.id, "name": h.name, "description": h.description,
                "is_negative": h.is_negative, "mode": h.mode,
                "goal_value": h.goal_value, "goal_unit": h.goal_unit,
                "category_id": h.category_id, "schedule_type": h.schedule_type,
                "schedule_params": h.schedule_params, "time_of_day": h.time_of_day,
                "reminder_time": h.reminder_time, "is_active": h.is_active,
                "is_paused": h.is_paused, "order": h.order,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in habits
        ],
        "entries": [
            {
                "id": e.id, "habit_id": e.habit_id,
                "date": e.date.isoformat(), "value": e.value, "note": e.note,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ],
    }


@router.get("/export")
def export_data(db: Session = Depends(get_db), _=Depends(get_current_user)):
    data = _export_data(db)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"habit_backup_{timestamp}.json"
    filepath = os.path.join(BACKUP_DIR, filename)
    os.makedirs(BACKUP_DIR, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
    return FileResponse(filepath, filename=filename, media_type="application/json")


@router.post("/import", status_code=204)
async def import_data(file: UploadFile = File(...), db: Session = Depends(get_db), _=Depends(get_current_user)):
    content = await file.read()
    try:
        data = json.loads(content)
    except Exception:
        raise HTTPException(400, "Invalid JSON file")

    # Clear existing data
    db.query(Entry).delete()
    db.query(Habit).delete()
    db.query(Category).delete()
    db.commit()

    # Re-insert categories
    cat_map = {}
    for c in data.get("categories", []):
        cat = Category(name=c["name"], color=c.get("color", "#6366f1"), icon=c.get("icon", "tag"))
        db.add(cat)
        db.flush()
        cat_map[c["id"]] = cat.id

    # Re-insert habits
    habit_map = {}
    for h in data.get("habits", []):
        from datetime import datetime as dt
        habit = Habit(
            name=h["name"], description=h.get("description", ""),
            is_negative=h.get("is_negative", False), mode=h.get("mode", "binary"),
            goal_value=h.get("goal_value"), goal_unit=h.get("goal_unit"),
            category_id=cat_map.get(h.get("category_id")),
            schedule_type=h.get("schedule_type", "daily"),
            schedule_params=h.get("schedule_params", {}),
            time_of_day=h.get("time_of_day"), reminder_time=h.get("reminder_time"),
            is_active=h.get("is_active", True), is_paused=h.get("is_paused", False),
            order=h.get("order", 0),
        )
        if h.get("created_at"):
            habit.created_at = dt.fromisoformat(h["created_at"])
        db.add(habit)
        db.flush()
        habit_map[h["id"]] = habit.id

    # Re-insert entries
    from datetime import date as date_type
    for e in data.get("entries", []):
        if e["habit_id"] not in habit_map:
            continue
        entry = Entry(
            habit_id=habit_map[e["habit_id"]],
            date=date_type.fromisoformat(e["date"]),
            value=e.get("value", 1.0),
            note=e.get("note", ""),
        )
        db.add(entry)

    db.commit()


@router.get("/list", response_model=List[BackupInfo])
def list_backups(_=Depends(get_current_user)):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    files = []
    for fname in os.listdir(BACKUP_DIR):
        if fname.endswith(".json"):
            fpath = os.path.join(BACKUP_DIR, fname)
            stat = os.stat(fpath)
            files.append(BackupInfo(
                filename=fname,
                size=stat.st_size,
                created_at=datetime.fromtimestamp(stat.st_mtime).isoformat(),
            ))
    return sorted(files, key=lambda x: x.created_at, reverse=True)


@router.delete("/{filename}", status_code=204)
def delete_backup(filename: str, _=Depends(get_current_user)):
    if "/" in filename or ".." in filename:
        raise HTTPException(400, "Invalid filename")
    fpath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(404, "Backup not found")
    os.remove(fpath)
