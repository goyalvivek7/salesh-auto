import imaplib
import email
from email.header import decode_header
from typing import List, Dict
from app.config import settings


class IMAPService:
    """Service for checking email replies via IMAP."""
    
    async def check_for_replies(self) -> List[Dict]:
        """
        Check inbox for replies to outreach emails.
        
        Returns:
            List of reply dictionaries with from_email, subject, content
        """
        replies = []
        
        try:
            # Connect to IMAP server
            imap = imaplib.IMAP4_SSL(settings.smtp_host)
            imap.login(settings.smtp_username, settings.smtp_password)
            
            # Select inbox
            imap.select('INBOX')
            
            # Search for unread emails from last 24 hours
            status, messages = imap.search(None, 'UNSEEN')
            
            if status != 'OK':
                return replies
            
            # Get email IDs
            email_ids = messages[0].split()
            
            for email_id in email_ids[-50:]:  # Process last 50 unread
                try:
                    # Fetch email
                    status, msg_data = imap.fetch(email_id, '(RFC822)')
                    
                    if status != 'OK':
                        continue
                    
                    # Parse email
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    
                    # Get from email
                    from_email = msg.get('From', '')
                    if '<' in from_email:
                        from_email = from_email.split('<')[1].split('>')[0]
                    
                    # Get subject
                    subject = msg.get('Subject', '')
                    if subject:
                        decoded = decode_header(subject)[0]
                        if isinstance(decoded[0], bytes):
                            subject = decoded[0].decode(decoded[1] or 'utf-8')
                        else:
                            subject = decoded[0]
                    
                    # Get content
                    content = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            if part.get_content_type() == "text/plain":
                                content = part.get_payload(decode=True).decode()
                                break
                    else:
                        content = msg.get_payload(decode=True).decode()
                    
                    replies.append({
                        'from_email': from_email,
                        'subject': subject,
                        'content': content[:500]  # First 500 chars
                    })
                    
                except Exception as e:
                    print(f"Error parsing email {email_id}: {str(e)}")
                    continue
            
            imap.close()
            imap.logout()
            
        except Exception as e:
            print(f"Error connecting to IMAP: {str(e)}")
        
        return replies


# Global instance
imap_service = IMAPService()
