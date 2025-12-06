from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.models import Company, Message
from app.schemas import CompanyCreate, CompanyUpdate


def get_company_by_name(db: Session, name: str) -> Optional[Company]:
    """Check if a company with the same name already exists (case-insensitive)."""
    return db.query(Company).filter(func.lower(Company.name) == name.lower()).first()


def create_company(db: Session, company: CompanyCreate) -> Company:
    """Create a single company in the database with normalized industry/country."""
    db_company = Company(
        name=company.name.strip(),
        industry=company.industry.strip().upper() if company.industry else None,
        country=company.country.strip().upper() if company.country else None,
        email=company.email,
        phone=company.phone,
        website=company.website
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def create_companies_bulk(db: Session, companies: List[CompanyCreate]) -> List[Company]:
    """Create multiple companies in the database, skipping duplicates and normalizing casing."""
    db_companies = []
    skipped = 0
    
    for company in companies:
        # Check if company already exists by name
        existing = get_company_by_name(db, company.name)
        if existing:
            skipped += 1
            continue
        
        db_company = Company(
            name=company.name.strip(),
            industry=company.industry.strip().upper() if company.industry else None,
            country=company.country.strip().upper() if company.country else None,
            email=company.email,
            phone=company.phone,
            website=company.website
        )
        db_companies.append(db_company)
    
    if db_companies:
        db.add_all(db_companies)
        db.commit()
        
        # Refresh all companies to get their IDs
        for db_company in db_companies:
            db.refresh(db_company)
    
    return db_companies


def get_companies(db: Session, skip: int = 0, limit: int = 100) -> List[Company]:
    """Get all companies with pagination."""
    return db.query(Company).offset(skip).limit(limit).all()


def get_companies_by_industry(db: Session, industry: str, skip: int = 0, limit: int = 100, fetched_on: str = None, exclude_in_campaigns: bool = True) -> List[Company]:
    """Get companies filtered by industry (case-insensitive) and optionally by created_at date.
    By default, excludes companies that are already in any campaign.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import not_, exists
    
    query = db.query(Company).filter(Company.industry.ilike(industry))
    
    # Exclude companies already in any campaign (have messages)
    if exclude_in_campaigns:
        companies_in_campaigns = db.query(Message.company_id).distinct().subquery()
        query = query.filter(not_(Company.id.in_(db.query(companies_in_campaigns))))
    
    # Filter by created_at date if provided
    if fetched_on:
        try:
            target_date = datetime.strptime(fetched_on, "%Y-%m-%d")
            next_date = target_date + timedelta(days=1)
            query = query.filter(
                Company.created_at >= target_date,
                Company.created_at < next_date
            )
        except ValueError:
            pass  # Invalid date format, skip filtering
    
    return query.offset(skip).limit(limit).all()


def get_company_by_id(db: Session, company_id: int) -> Optional[Company]:
    """Get a company by ID."""
    return db.query(Company).filter(Company.id == company_id).first()


def update_company(db: Session, company_id: int, company_update: CompanyUpdate) -> Optional[Company]:
    """Update a company."""
    db_company = get_company_by_id(db, company_id)
    if not db_company:
        return None
    
    update_data = company_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_company, key, value)
    
    db.commit()
    db.refresh(db_company)
    return db_company
