from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models import UnsubscribeList, ReplyTracking, Company
from app.utils.timezone import now_ist
from typing import Optional


class UnsubscribeService:
    """Service for managing unsubscribe functionality."""
    
    @staticmethod
    def is_unsubscribed(db: Session, email: str) -> bool:
        """
        Check if an email address is unsubscribed.
        
        Args:
            db: Database session
            email: Email address to check
            
        Returns:
            True if unsubscribed, False otherwise
        """
        return db.query(UnsubscribeList).filter(
            UnsubscribeList.email == email.lower()
        ).first() is not None
    
    @staticmethod
    def add_to_unsubscribe_list(
        db: Session,
        email: str,
        company_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> UnsubscribeList:
        """
        Add an email to the unsubscribe list.
        
        Args:
            db: Database session
            email: Email address to unsubscribe
            company_id: Optional company ID
            reason: Optional reason for unsubscribing
            
        Returns:
            UnsubscribeList entry
        """
        # Check if already unsubscribed
        existing = db.query(UnsubscribeList).filter(
            UnsubscribeList.email == email.lower()
        ).first()
        
        if existing:
            return existing
        
        # Create new unsubscribe entry
        unsubscribe = UnsubscribeList(
            email=email.lower(),
            company_id=company_id,
            reason=reason,
            unsubscribed_at=now_ist()
        )
        
        db.add(unsubscribe)
        db.commit()
        db.refresh(unsubscribe)
        
        return unsubscribe
    
    @staticmethod
    def get_unsubscribe_stats(db: Session) -> dict:
        """
        Get unsubscribe statistics.
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with stats
        """
        total = db.query(UnsubscribeList).count()
        
        # Last 7 days - use naive datetime for comparison
        week_ago = (now_ist() - timedelta(days=7)).replace(tzinfo=None)
        last_week = db.query(UnsubscribeList).filter(
            UnsubscribeList.unsubscribed_at >= week_ago
        ).count()
        
        # Last 30 days
        month_ago = (now_ist() - timedelta(days=30)).replace(tzinfo=None)
        last_month = db.query(UnsubscribeList).filter(
            UnsubscribeList.unsubscribed_at >= month_ago
        ).count()
        
        return {
            "total_unsubscribed": total,
            "last_7_days": last_week,
            "last_30_days": last_month,
            "unsubscribed_last_7_days": last_week,
            "unsubscribed_last_30_days": last_month
        }


class ReplyTrackingService:
    """Service for tracking email replies."""
    
    @staticmethod
    def has_replied(db: Session, company_id: int) -> bool:
        """
        Check if a company has replied to any outreach.
        
        Args:
            db: Database session
            company_id: Company ID to check
            
        Returns:
            True if company replied, False otherwise
        """
        return db.query(ReplyTracking).filter(
            ReplyTracking.company_id == company_id
        ).first() is not None
    
    @staticmethod
    def record_reply(
        db: Session,
        company_id: int,
        from_email: str,
        subject: Optional[str] = None,
        reply_content: Optional[str] = None,
        campaign_id: Optional[int] = None,
        message_id: Optional[int] = None
    ) -> ReplyTracking:
        """
        Record that a company replied.
        
        Args:
            db: Database session
            company_id: Company ID
            from_email: Email address that sent reply
            subject: Email subject
            reply_content: Content of reply
            campaign_id: Optional campaign ID
            message_id: Optional message ID
            
        Returns:
            ReplyTracking entry
        """
        # Check if reply already recorded
        existing = db.query(ReplyTracking).filter(
            ReplyTracking.company_id == company_id,
            ReplyTracking.from_email == from_email.lower()
        ).first()
        
        if existing:
            return existing
        
        # Create new reply tracking entry
        reply = ReplyTracking(
            company_id=company_id,
            campaign_id=campaign_id,
            message_id=message_id,
            from_email=from_email.lower(),
            subject=subject,
            reply_content=reply_content,
            replied_at=now_ist()
        )
        
        db.add(reply)
        db.commit()
        db.refresh(reply)
        
        return reply
    
    @staticmethod
    def get_reply_stats(db: Session) -> dict:
        """
        Get reply statistics.
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with stats
        """
        total = db.query(ReplyTracking).count()
        
        # Last 7 days - use naive datetime for comparison
        week_ago = (now_ist() - timedelta(days=7)).replace(tzinfo=None)
        last_week = db.query(ReplyTracking).filter(
            ReplyTracking.replied_at >= week_ago
        ).count()
        
        # Last 30 days
        month_ago = (now_ist() - timedelta(days=30)).replace(tzinfo=None)
        last_month = db.query(ReplyTracking).filter(
            ReplyTracking.replied_at >= month_ago
        ).count()
        
        return {
            "total_replies": total,
            "last_7_days": last_week,
            "last_30_days": last_month,
            "replies_last_7_days": last_week,
            "replies_last_30_days": last_month
        }


# Global instances
unsubscribe_service = UnsubscribeService()
reply_tracking_service = ReplyTrackingService()
