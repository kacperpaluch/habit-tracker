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
        subject="Habit Tracker — Test Email",
        body_html="<p>Your Habit Tracker email configuration is working correctly.</p>",
    )


async def send_daily_reminder(settings: Settings, habits: list):
    if not habits:
        return

    rows = "".join(
        f"<tr><td style='padding:8px;border-bottom:1px solid #eee'>{h['name']}</td>"
        f"<td style='padding:8px;border-bottom:1px solid #eee'>{h.get('time_of_day','')}</td></tr>"
        for h in habits
    )
    body = f"""
    <h2 style="font-family:sans-serif">Habit Tracker — Daily Reminder</h2>
    <p style="font-family:sans-serif">You have the following habits left for today:</p>
    <table style="border-collapse:collapse;font-family:sans-serif">
      <thead>
        <tr>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #6366f1">Habit</th>
          <th style="padding:8px;text-align:left;border-bottom:2px solid #6366f1">Time of day</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    """
    await send_email(settings, subject="Habit Tracker — Daily Reminder", body_html=body)


async def send_habit_reminder(settings: Settings, habit_name: str):
    body = f"""
    <h2 style="font-family:sans-serif">Habit Tracker — Reminder</h2>
    <p style="font-family:sans-serif">
      Time to work on: <strong>{habit_name}</strong>
    </p>
    """
    await send_email(settings, subject=f"Habit Tracker — {habit_name}", body_html=body)
