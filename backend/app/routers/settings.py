import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Settings
from ..schemas import SettingsUpdate, SettingsOut
from ..auth import get_current_user, hash_password, verify_password
from .. import scheduler as scheduler_lib

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    s = db.query(Settings).first()
    if not s:
        raise HTTPException(500, "Settings not found")
    return s


@router.put("", response_model=SettingsOut)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db), current=Depends(get_current_user)):
    s = db.query(Settings).first()
    if not s:
        raise HTTPException(500, "Settings not found")

    if data.new_password:
        if not data.current_password or not verify_password(data.current_password, s.hashed_password):
            raise HTTPException(400, "Current password is incorrect")
        s.hashed_password = hash_password(data.new_password)

    fields = data.model_dump(exclude_none=True, exclude={"current_password", "new_password"})
    # Empty SMTP password means "leave unchanged" (form never echoes it back)
    if fields.get("smtp_password") == "":
        fields.pop("smtp_password")
    for k, v in fields.items():
        setattr(s, k, v)

    db.commit()
    db.refresh(s)

    # Apply schedule/timezone changes to the running scheduler immediately
    try:
        scheduler_lib.reschedule(s)
    except Exception as e:
        logger.warning(f"Could not reschedule jobs: {e}")

    return s


@router.post("/test-email")
async def test_email(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from ..email import send_test_email
    s = db.query(Settings).first()
    try:
        await send_test_email(s)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(400, str(e))
