"""
Google Search Service for finding company contact information.

This service uses Google Custom Search API to find company websites,
then scrapes those websites to extract email addresses and phone numbers.
Includes enhanced search queries and multiple fallback strategies.
"""

import re
import requests
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import settings


class GoogleSearchService:
    """Service for searching company details using Google Custom Search API."""
    
    def __init__(self):
        self.api_key = settings.google_api_key
        self.search_engine_id = settings.google_search_engine_id
        self.enabled = settings.google_search_enabled
        
        # Email regex pattern (matches most common email formats)
        self.email_pattern = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        )
        
        # Phone number regex patterns for common formats
        self.phone_patterns = [
            # International format: +1-234-567-8900, +91 98765 43210
            re.compile(r'\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}'),
            # US format: (123) 456-7890, 123-456-7890
            re.compile(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'),
            # International without country code: 1234567890
            re.compile(r'\b\d{10,15}\b')
        ]
    
    def search_company_details(
        self,
        company_name: str,
        industry: str,
        country: str
    ) -> Dict[str, any]:
        """
        Search for company contact details using Google Search.
        
        Args:
            company_name: Name of the company
            industry: Industry sector
            country: Country location
            
        Returns:
            Dictionary with 'emails', 'phones', 'website' lists
        """
        if not self.enabled or not self.api_key or not self.search_engine_id:
            print("⚠️  Google Search API not configured or disabled")
            return {'emails': [], 'phones': [], 'website': None}
        
        try:
            emails = set()
            phones = set()
            website = None
            
            # Strategy 1: Search for company website and scrape it
            print(f"🔍 Strategy 1: Searching website for {company_name}...")
            website = self._search_company_website(company_name, industry, country)
            
            if website:
                print(f"   Found website: {website}")
                site_emails, site_phones = self._extract_contact_info(website)
                emails.update(site_emails)
                phones.update(site_phones)
            
            # Strategy 2: Direct search for email
            if len(emails) < 2:
                print(f"🔍 Strategy 2: Searching directly for email...")
                direct_emails = self._search_direct_contact(company_name, country, "email")
                emails.update(direct_emails)
            
            # Strategy 3: Direct search for phone
            if len(phones) < 2:
                print(f"🔍 Strategy 3: Searching directly for phone...")
                direct_phones = self._search_direct_contact(company_name, country, "phone")
                phones.update(direct_phones)
            
            emails_list = list(emails)[:5]
            phones_list = list(phones)[:5]
            
            print(f"✅ Total found: {len(emails_list)} email(s), {len(phones_list)} phone(s)")
            
            return {
                'emails': emails_list,
                'phones': phones_list,
                'website': website
            }
            
        except Exception as e:
            print(f"❌ Error searching for {company_name}: {str(e)}")
            return {'emails': [], 'phones': [], 'website': None}
    
    def _search_direct_contact(
        self,
        company_name: str,
        country: str,
        contact_type: str
    ) -> List[str]:
        """
        Directly search for email or phone number using Google.
        
        Args:
            company_name: Name of the company
            country: Country location
            contact_type: 'email' or 'phone'
            
        Returns:
            List of emails or phones found
        """
        try:
            # Build targeted search query
            if contact_type == "email":
                query = f'"{company_name}" {country} contact email address'
            else:
                query = f'"{company_name}" {country} contact phone number'
            
            # Build the Custom Search API service
            service = build("customsearch", "v1", developerKey=self.api_key)
            
            # Execute the search
            result = service.cse().list(
                q=query,
                cx=self.search_engine_id,
                num=5  # Get top 5 results
            ).execute()
            
            contacts = set()
            
            if 'items' in result:
                for item in result['items']:
                    # Extract from snippet and title
                    text = item.get('snippet', '') + ' ' + item.get('title', '')
                    
                    if contact_type == "email":
                        found = self.email_pattern.findall(text)
                        for email in found:
                            if not any(skip in email.lower() for skip in ['example.com', 'domain.com', 'email.com', 'google.com', 'youtube.com']):
                                contacts.add(email.lower())
                                print(f"   Found email in search results: {email}")
                    else:
                        for pattern in self.phone_patterns:
                            found = pattern.findall(text)
                            for phone in found:
                                cleaned = re.sub(r'[^\d+()-]', '', phone)
                                if len(cleaned) >= 10:
                                    contacts.add(phone.strip())
                                    print(f"   Found phone in search results: {phone}")
            
            return list(contacts)[:3]
            
        except Exception as e:
            print(f"   Error in direct search: {str(e)}")
            return []
    
    def _search_company_website(
        self,
        company_name: str,
        industry: str,
        country: str
    ) -> Optional[str]:
        """
        Search for company website using Google Custom Search.
        
        Returns:
            Website URL or None if not found
        """
        try:
            # Build the search query
            query = f'"{company_name}" {industry} {country} official website'
            
            # Build the Custom Search API service
            service = build("customsearch", "v1", developerKey=self.api_key)
            
            # Execute the search
            result = service.cse().list(
                q=query,
                cx=self.search_engine_id,
                num=3  # Get top 3 results
            ).execute()
            
            # Extract website from first result
            if 'items' in result and len(result['items']) > 0:
                # Try to find the most relevant result (avoid support/help pages)
                for item in result['items']:
                    url = item.get('link', '')
                    # Skip support/help pages, prefer main domain
                    if not any(term in url.lower() for term in ['support.', 'help.', '/support/', '/help/']):
                        return url
                # Fall back to first result
                return result['items'][0].get('link')
            
            return None
            
        except HttpError as e:
            print(f"   Google API error: {str(e)}")
            return None
        except Exception as e:
            print(f"   Error searching website: {str(e)}")
            return None
    
    def _extract_contact_info(self, website_url: str) -> tuple[List[str], List[str]]:
        """
        Extract email addresses and phone numbers from a website.
        
        Args:
            website_url: URL to scrape
            
        Returns:
            Tuple of (emails list, phones list)
        """
        emails = set()
        phones = set()
        
        try:
            # Try to fetch the main page
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            # Get main page
            response = requests.get(website_url, headers=headers, timeout=10, allow_redirects=True)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Extract text content
            text_content = soup.get_text(separator=' ')
            
            # Also extract from meta tags and links
            for meta in soup.find_all('meta'):
                text_content += ' ' + str(meta.get('content', ''))
            
            # Try to find and scrape contact/about pages
            contact_pages = []
            for link in soup.find_all('a', href=True):
                href = str(link['href']).lower()
                if any(term in href for term in ['contact', 'about', 'reach-us', 'get-in-touch']):
                    # Build full URL
                    if href.startswith('http'):
                        contact_pages.append(href)
                    elif href.startswith('/'):
                        base_url = '/'.join(website_url.split('/')[:3])
                        contact_pages.append(base_url + href)
                    
                    if len(contact_pages) >= 2:  # Limit to 2 contact pages
                        break
            
            # Scrape contact pages
            for contact_url in contact_pages[:2]:
                try:
                    print(f"   Scraping contact page: {contact_url}")
                    contact_response = requests.get(contact_url, headers=headers, timeout=10)
                    contact_response.raise_for_status()
                    contact_soup = BeautifulSoup(contact_response.text, 'html.parser')
                    
                    # Remove scripts
                    for script in contact_soup(["script", "style"]):
                        script.decompose()
                    
                    text_content += "\n" + contact_soup.get_text(separator=' ')
                except:
                    pass  # Ignore contact page errors
            
            # Extract emails
            found_emails = self.email_pattern.findall(text_content)
            for email in found_emails:
                # Filter out common false positives
                if not any(skip in email.lower() for skip in [
                    'example.com', 'domain.com', 'email.com', '.png', '.jpg', 
                    'sentry.io', 'schema.org', 'w3.org', 'google.com', 'facebook.com',
                    'twitter.com', 'linkedin.com', '@2x', 'wixpress.com'
                ]):
                    emails.add(email.lower())
                    print(f"   Found email: {email}")
            
            # Extract phone numbers
            for pattern in self.phone_patterns:
                found_phones = pattern.findall(text_content)
                for phone in found_phones:
                    # Clean up phone number
                    cleaned = re.sub(r'[^\d+()-]', '', phone)
                    if len(cleaned) >= 10:  # Minimum viable phone number length
                        # Avoid common false positives (dates, zip codes, etc.)
                        if not re.match(r'^\d{4}$|^\d{5}$|^\d{6}$', cleaned):
                            phones.add(phone.strip())
                            print(f"   Found phone: {phone}")
            
            return list(emails)[:5], list(phones)[:5]  # Limit to 5 each
            
        except requests.RequestException as e:
            print(f"   Error fetching website {website_url}: {str(e)}")
            return [], []
        except Exception as e:
            print(f"   Error extracting contact info: {str(e)}")
            return [], []


# Global instance
google_search_service = GoogleSearchService()
