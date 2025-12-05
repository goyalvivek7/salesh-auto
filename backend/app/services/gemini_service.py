import google.generativeai as genai
from typing import Dict, Optional
import json

from app.config import settings


class GeminiService:
    """Service for interacting with Google Gemini API."""
    
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def fetch_missing_details(
        self, 
        company_name: str,
        industry: str,
        country: str,
        missing_fields: list[str]
    ) -> Dict[str, Optional[str]]:
        """
        Fetch missing company details using Gemini.
        
        Args:
            company_name: Name of the company
            industry: Industry sector
            country: Country location
            missing_fields: List of fields that need to be filled (e.g., ['email', 'phone'])
            
        Returns:
            Dictionary with the missing field values
        """
        field_descriptions = {
            'email': 'company contact email address',
            'phone': f'company phone number with {country} country code',
            'website': 'company website URL'
        }
        
        fields_str = ', '.join([field_descriptions[f] for f in missing_fields])
        
        prompt = f"""For the company "{company_name}" in the {industry} industry located in {country}, provide the following missing details: {fields_str}.

Return ONLY a JSON object with these fields: {', '.join(missing_fields)}.

Example format:
{{
  "email": "contact@example.com",
  "phone": "+1-555-0123",
  "website": "https://www.example.com"
}}

Only include the fields that were requested: {missing_fields}. Make the details realistic and appropriate for {country}."""

        try:
            response = self.model.generate_content(prompt)
            result = self._parse_response(response.text, missing_fields)
            return result
        except Exception as e:
            print(f"Error fetching from Gemini: {str(e)}")
            return {field: None for field in missing_fields}
    
    def _parse_response(self, content: str, expected_fields: list[str]) -> Dict[str, Optional[str]]:
        """Parse Gemini response into structured data."""
        try:
            # Try to find JSON object in the response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                return {field: None for field in expected_fields}
            
            json_str = content[start_idx:end_idx]
            data = json.loads(json_str)
            
            # Return only the requested fields
            return {field: data.get(field) for field in expected_fields}
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse Gemini response: {str(e)}")
            return {field: None for field in expected_fields}


# Create a global instance
gemini_service = GeminiService()
