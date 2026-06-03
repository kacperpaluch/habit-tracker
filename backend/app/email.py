import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from .models import Settings


async def send_email(settings: Settings, subject: str, body_html: str):
    if not settings.smtp_host or not settings.notification_email:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from or settings.smtp_user
    msg["To"] = settings.notification_email
    msg.attach(MIMEText(body_html, "html"))

    kwargs = {
        "hostname": settings.smtp_host,
        "port": settings.smtp_port,
        "username": settings.smtp_user,
        "password": settings.smtp_password,
    }
    if settings.smtp_tls:
        # port 465 → implicit TLS; port 587 (i inne) → STARTTLS
        if settings.smtp_port == 465:
            kwargs["use_tls"] = True
        else:
            kwargs["start_tls"] = True

    await aiosmtplib.send(msg, **kwargs)


async def send_test_email(settings: Settings):
    await send_email(
        settings,
        subject="Habit Tracker — E-mail testowy",
        body_html="<p>Konfiguracja e-mail w Habit Tracker działa poprawnie.</p>",
    )


async def send_daily_reminder(settings: Settings, habits: list):
    if not habits:
        return

    TIME_OF_DAY_PL = {"morning": "rano", "afternoon": "południe", "evening": "wieczór"}
    rows = "".join(
        f"<tr><td style='padding:8px;border-bottom:1px solid #eee'>{h['name']}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee'>{TIME_OF_DAY_PL.get(h.get('time_of_day', ''), h.get('time_of_day', ''))}</td></tr>"
        for h in habits
    )
    body = f"""
    <h2 style="font-family:sans-serif">Habit Tracker — Dzienne podsumowanie</h2>
    <p style="font-family:sans-serif">Na dziś pozostały następujące nawyki do wykonania:</p>
    <table style="border-collapse:collapse;font-family:sans-serif">
      <thead>
        <tr>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #6366f1">Nawyk</th>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #6366f1">Pora dnia</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    """
    await send_email(settings, subject="Habit Tracker — Dzienne podsumowanie", body_html=body)


async def send_habit_reminder(settings: Settings, habit_name: str):
    body = f"""
    <h2 style="font-family:sans-serif">Habit Tracker — Przypomnienie</h2>
    <p style="font-family:sans-serif">
      Czas na: <strong>{habit_name}</strong>
    </p>
    """
    await send_email(settings, subject=f"Habit Tracker — {habit_name}", body_html=body)
