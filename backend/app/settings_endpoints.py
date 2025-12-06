from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict

from app.database import get_db
from app.models import SystemConfig
from app.schemas import (
    GeneralSettingsUpdate,
    EmailSettingsUpdate,
    NotificationSettingsUpdate,
    SettingsResponse
)
from app.utils.timezone import now_ist

router = APIRouter(prefix="/api/settings", tags=["settings"])


def get_setting(db: Session, key: str, default: str = "") -> str:
    """Get a setting value from database or return default."""
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    return config.value if config else default


def set_setting(db: Session, key: str, value: str, description: str = None):
    """Set a setting value in database."""
    config = db.query(SystemConfig).filter(SystemConfig.key == key).first()
    if config:
        config.value = value
        config.updated_at = now_ist()
        if description:
            config.description = description
    else:
        config = SystemConfig(
            key=key,
            value=value,
            description=description,
            updated_at=now_ist()
        )
        db.add(config)
    db.commit()
    return config


@router.get("", response_model=SettingsResponse)
async def get_all_settings(db: Session = Depends(get_db)):
    """
    Get all application settings.
    
    Returns:
        Settings grouped by category (general, email, notifications)
    """
    # General Settings
    general = {
        "company_name": get_setting(db, "company_name", ""),
        "company_website": get_setting(db, "company_website", ""),
        "timezone": get_setting(db, "timezone", "UTC"),
        "language": get_setting(db, "language", "en"),
        "theme": get_setting(db, "theme", "dark")
    }

    
    # Email Settings
    email = {
        "smtp_server": get_setting(db, "smtp_server", ""),
        "smtp_port": get_setting(db, "smtp_port", "587"),
        "smtp_username": get_setting(db, "smtp_username", ""),
        "smtp_password": get_setting(db, "smtp_password", ""),
        "from_email": get_setting(db, "from_email", ""),
        "from_name": get_setting(db, "from_name", "")
    }
    
    # Notification Settings
    notifications = {
        "email_notifications": get_setting(db, "email_notifications", "true") == "true",
        "reply_notifications": get_setting(db, "reply_notifications", "true") == "true",
        "daily_reports": get_setting(db, "daily_reports", "false") == "true",
        "weekly_reports": get_setting(db, "weekly_reports", "true") == "true"
    }
    
    return SettingsResponse(
        general=general,
        email=email,
        notifications=notifications
    )


@router.put("/general")
async def update_general_settings(
    settings: GeneralSettingsUpdate,
    db: Session = Depends(get_db)
):
    """
    Update general application settings.
    
    Args:
        settings: General settings to update
        
    Returns:
        Success message with updated settings
    """
    updated = {}
    
    if settings.company_name is not None:
        set_setting(db, "company_name", settings.company_name, "Company Name")
        updated["company_name"] = settings.company_name
        
    if settings.company_website is not None:
        set_setting(db, "company_website", settings.company_website, "Company Website")
        updated["company_website"] = settings.company_website
        
    if settings.timezone is not None:
        set_setting(db, "timezone", settings.timezone, "Application Timezone")
        updated["timezone"] = settings.timezone
        
    if settings.language is not None:
        set_setting(db, "language", settings.language, "Application Language")
        updated["language"] = settings.language
        
    if settings.theme is not None:
        set_setting(db, "theme", settings.theme, "Application Theme")
        updated["theme"] = settings.theme
    
    return {
        "message": "General settings updated successfully",
        "updated": updated
    }



@router.put("/email")
async def update_email_settings(
    settings: EmailSettingsUpdate,
    db: Session = Depends(get_db)
):
    """
    Update email configuration settings.
    
    Args:
        settings: Email settings to update
        
    Returns:
        Success message with updated settings
    """
    updated = {}
    
    if settings.smtp_server is not None:
        set_setting(db, "smtp_server", settings.smtp_server, "SMTP Server")
        updated["smtp_server"] = settings.smtp_server
        
    if settings.smtp_port is not None:
        set_setting(db, "smtp_port", str(settings.smtp_port), "SMTP Port")
        updated["smtp_port"] = settings.smtp_port
        
    if settings.smtp_username is not None:
        set_setting(db, "smtp_username", settings.smtp_username, "SMTP Username")
        updated["smtp_username"] = settings.smtp_username
        
    if settings.smtp_password is not None:
        set_setting(db, "smtp_password", settings.smtp_password, "SMTP Password")
        updated["smtp_password"] = "********"  # Don't return password in response
        
    if settings.from_email is not None:
        set_setting(db, "from_email", settings.from_email, "From Email")
        updated["from_email"] = settings.from_email
        
    if settings.from_name is not None:
        set_setting(db, "from_name", settings.from_name, "From Name")
        updated["from_name"] = settings.from_name
    
    return {
        "message": "Email settings updated successfully",
        "updated": updated
    }


@router.put("/notifications")
async def update_notification_settings(
    settings: NotificationSettingsUpdate,
    db: Session = Depends(get_db)
):
    """
    Update notification preferences.
    
    Args:
        settings: Notification settings to update
        
    Returns:
        Success message with updated settings
    """
    updated = {}
    
    if settings.email_notifications is not None:
        set_setting(db, "email_notifications", str(settings.email_notifications).lower(), "Email Notifications Enabled")
        updated["email_notifications"] = settings.email_notifications
        
    if settings.reply_notifications is not None:
        set_setting(db, "reply_notifications", str(settings.reply_notifications).lower(), "Reply Notifications Enabled")
        updated["reply_notifications"] = settings.reply_notifications
        
    if settings.daily_reports is not None:
        set_setting(db, "daily_reports", str(settings.daily_reports).lower(), "Daily Reports Enabled")
        updated["daily_reports"] = settings.daily_reports
        
    if settings.weekly_reports is not None:
        set_setting(db, "weekly_reports", str(settings.weekly_reports).lower(), "Weekly Reports Enabled")
        updated["weekly_reports"] = settings.weekly_reports
    
    return {
        "message": "Notification preferences updated successfully",
        "updated": updated
    }


@router.post("/email/test")
async def test_email_settings(
    test_email: str,
    db: Session = Depends(get_db)
):
    """
    Send a test email to verify SMTP settings are working.
    
    Args:
        test_email: Email address to send test email to
        
    Returns:
        Result of the test email send attempt
    """
    from app.services.email_service import email_service
    
    try:
        result = await email_service.send_email_async(
            to_email=test_email,
            subject="Test Email - Settings Verification",
            content="""
            <h2>SMTP Settings Test</h2>
            <p>This is a test email to verify your SMTP settings are correctly configured.</p>
            <p>If you received this email, your email settings are working properly!</p>
            <p><strong>Sent from:</strong> Automatic Sales Application</p>
            """,
            html=True
        )
        
        if result.get("status") == "sent":
            return {
                "success": True,
                "message": f"Test email sent successfully to {test_email}",
                "details": result
            }
        else:
            return {
                "success": False,
                "message": "Failed to send test email",
                "error": result.get("error", "Unknown error"),
                "details": result
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": "Error sending test email",
            "error": str(e)
        }
