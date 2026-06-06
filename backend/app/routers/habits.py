from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from ..database import get_db
from ..models import Habit, Entry
from ..schemas import HabitCreate, HabitUpdate, HabitOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/habits", tags=["habits"])


@router.get("", response_model=List[HabitOut])
def list_habits(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Habit).options(joinedload(Habit.category))
    if not include_inactive:
        query = query.filter(Habit.is_active == True)
    return query.order_by(Habit.order, Habit.id).all()


@router.post("", response_model=HabitOut, status_code=201)
def create_habit(data: HabitCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = Habit(**data.model_dump())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    db.refresh(habit, ["category"])
    return habit


@router.get("/{habit_id}", response_model=HabitOut)
def get_habit(habit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = (
        db.query(Habit)
        .options(joinedload(Habit.category))
        .filter(Habit.id == habit_id)
        .first()
    )
    if not habit:
        raise HTTPException(404, "Habit not found")
    return habit


@router.put("/{habit_id}", response_model=HabitOut)
def update_habit(habit_id: int, data: HabitUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = db.query(Habit).options(joinedload(Habit.category)).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(404, "Habit not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(habit, k, v)
    db.commit()
    db.refresh(habit)
    db.refresh(habit, ["category"])
    return habit


@router.delete("/{habit_id}", status_code=204)
def archive_habit(habit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(404, "Habit not found")
    habit.is_active = False
    db.commit()


@router.delete("/{habit_id}/hard", status_code=204)
def hard_delete_habit(habit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(404, "Habit not found")
    db.delete(habit)
    db.commit()


@router.put("/{habit_id}/restore", response_model=HabitOut)
def restore_habit(habit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    habit = (
        db.query(Habit)
        .options(joinedload(Habit.category))
        .filter(Habit.id == habit_id)
        .first()
    )
    if not habit:
        raise HTTPException(404, "Habit not found")
    habit.is_active = True
    habit.is_paused = False
    db.commit()
    db.refresh(habit)
    db.refresh(habit, ["category"])
    return habit


@router.post("/reorder", status_code=204)
def reorder_habits(order: List[int], db: Session = Depends(get_db), _=Depends(get_current_user)):
    for idx, habit_id in enumerate(order):
        db.query(Habit).filter(Habit.id == habit_id).update({"order": idx})
    db.commit()
