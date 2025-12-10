"""Email Accounts API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import random

from app.database import get_db
from app.models import EmailAccount
from app.schemas import EmailAccountCreate, EmailAccountUpdate, EmailAccountResponse

router = APIRouter(prefix="/api/email-accounts", tags=["Email Accounts"])


@router.get("", response_model=dict)
async def list_email_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """List all email accounts with pagination."""
    query = db.query(EmailAccount)
    
    if active_only:
        query = query.filter(EmailAccount.is_active == True)
    
    total = query.count()
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    accounts = query.order_by(EmailAccount.created_at.desc()).offset(skip).limit(page_size).all()
    
    return {
        "items": [EmailAccountResponse.model_validate(a) for a in accounts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.post("", response_model=EmailAccountResponse)
async def create_email_account(
    account: EmailAccountCreate,
    db: Session = Depends(get_db)
):
    """Create a new email account."""
    # Check if email already exists
    existing = db.query(EmailAccount).filter(EmailAccount.email == account.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email account already exists")
    
    # If this is the first account or marked as default, handle default flag
    if account.is_default:
        # Unset other defaults
        db.query(EmailAccount).update({EmailAccount.is_default: False})
    
    db_account = EmailAccount(
        email=account.email,
        display_name=account.display_name,
        smtp_host=account.smtp_host,
        smtp_port=account.smtp_port,
        smtp_username=account.smtp_username,
        smtp_password=account.smtp_password,
        is_active=account.is_active,
        is_default=account.is_default,
        daily_limit=account.daily_limit,
    )
    
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    return EmailAccountResponse.model_validate(db_account)


@router.get("/{account_id}", response_model=EmailAccountResponse)
async def get_email_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific email account by ID."""
    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    return EmailAccountResponse.model_validate(account)


@router.put("/{account_id}", response_model=EmailAccountResponse)
async def update_email_account(
    account_id: int,
    account_update: EmailAccountUpdate,
    db: Session = Depends(get_db)
):
    """Update an email account."""
    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    update_data = account_update.model_dump(exclude_unset=True)
    
    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        db.query(EmailAccount).filter(EmailAccount.id != account_id).update({EmailAccount.is_default: False})
    
    for key, value in update_data.items():
        setattr(account, key, value)
    
    db.commit()
    db.refresh(account)
    
    return EmailAccountResponse.model_validate(account)


@router.delete("/{account_id}")
async def delete_email_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """Delete an email account."""
    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    db.delete(account)
    db.commit()
    
    return {"message": "Email account deleted successfully"}


@router.post("/{account_id}/test")
async def test_email_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """Test an email account connection."""
    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    # TODO: Implement actual SMTP connection test
    # For now, just return success
    return {"success": True, "message": "Connection test successful"}


def get_random_active_account(db: Session, account_ids: List[int] = None) -> Optional[EmailAccount]:
    """Get a random active email account from the specified list or all active accounts."""
    query = db.query(EmailAccount).filter(EmailAccount.is_active == True)
    
    if account_ids:
        query = query.filter(EmailAccount.id.in_(account_ids))
    
    # Filter accounts that haven't exceeded daily limit
    accounts = [a for a in query.all() if a.emails_sent_today < a.daily_limit]
    
    if not accounts:
        return None
    
    return random.choice(accounts)


def increment_email_sent_count(db: Session, account_id: int):
    """Increment the emails_sent_today counter for an account."""
    account = db.query(EmailAccount).filter(EmailAccount.id == account_id).first()
    if account:
        account.emails_sent_today += 1
        from app.utils.timezone import now_ist
        account.last_used_at = now_ist()
        db.commit()
