from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from ..database import get_db
from ..models import Entry, Habit
from ..schemas import EntryCreate, EntryUpdate, EntryOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/entries", tags=["entries"])


@router.get("", response_model=List[EntryOut])
def list_entries(
    habit_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Entry)
    if habit_id:
        q = q.filter(Entry.habit_id == habit_id)
    if date_from:
        q = q.filter(Entry.date >= date_from)
    if date_to:
        q = q.filter(Entry.date <= date_to)
    return q.order_by(Entry.date.desc()).all()


@router.post("", response_model=EntryOut, status_code=201)
def create_entry(data: EntryCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = db.query(Habit).filter(Habit.id == data.habit_id).first()
    if not habit:
        raise HTTPException(404, "Habit not found")

    existing = db.query(Entry).filter(Entry.habit_id == data.habit_id, Entry.date == data.date).first()
    if existing:
        # value=0 means "note only" — never overwrite a real completion
        if data.value > 0:
            if habit.mode == "quantitative":
                existing.value += data.value
            else:
                existing.value = data.value
        if data.note:
            existing.note = data.note
        db.commit()
        db.refresh(existing)
        return existing

    entry = Entry(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{entry_id}", response_model=EntryOut)
def update_entry(entry_id: int, data: EntryUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    entry = db.query(Entry).filter(Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    db.delete(entry)
    db.commit()


@router.delete("/habit/{habit_id}/date/{entry_date}", status_code=204)
def delete_entry_by_date(habit_id: int, entry_date: date, db: Session = Depends(get_db), _=Depends(get_current_user)):
    entry = db.query(Entry).filter(Entry.habit_id == habit_id, Entry.date == entry_date).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    db.delete(entry)
    db.commit()
