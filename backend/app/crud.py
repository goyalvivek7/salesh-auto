from sqlalchemy.orm import Session
from typing import List, Optional

from app.models import Company
from app.schemas import CompanyCreate, CompanyUpdate


def create_company(db: Session, company: CompanyCreate) -> Company:
    """Create a single company in the database."""
    db_company = Company(
        name=company.name,
        industry=company.industry,
        country=company.country,
        email=company.email,
        phone=company.phone,
        website=company.website
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def create_companies_bulk(db: Session, companies: List[CompanyCreate]) -> List[Company]:
    """Create multiple companies in the database."""
    db_companies = []
    for company in companies:
        db_company = Company(
            name=company.name,
            industry=company.industry,
            country=company.country,
            email=company.email,
            phone=company.phone,
            website=company.website
        )
        db_companies.append(db_company)
    
    db.add_all(db_companies)
    db.commit()
    
    # Refresh all companies to get their IDs
    for db_company in db_companies:
        db.refresh(db_company)
    
    return db_companies


def get_companies(db: Session, skip: int = 0, limit: int = 100) -> List[Company]:
    """Get all companies with pagination."""
    return db.query(Company).offset(skip).limit(limit).all()


def get_companies_by_industry(db: Session, industry: str, skip: int = 0, limit: int = 100) -> List[Company]:
    """Get companies filtered by industry."""
    return db.query(Company).filter(Company.industry == industry).offset(skip).limit(limit).all()


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
