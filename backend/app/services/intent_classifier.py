"""
Intent Classifier Service for analyzing reply text and classifying intent.

Uses GPT to classify replies into HOT, WARM, COLD, or UNSUBSCRIBE categories.
Falls back to keyword matching for performance when GPT is unavailable.
"""

import json
import re
from typing import Dict, List, Optional
from dataclasses import dataclass

from app.enums import IntentType
from app.config import settings


@dataclass
class IntentResult:
    """Result from intent classification."""
    intent: IntentType
    confidence: float
    reasons: List[str]


class IntentClassifier:
    """Service for classifying reply intent using GPT or keyword fallback."""
    
    # Keywords for each intent type (fallback when GPT unavailable)
    HOT_KEYWORDS = [
        "interested", "demo", "demonstration", "price", "pricing", "cost",
        "quote", "meeting", "call", "schedule", "discuss", "learn more",
        "tell me more", "send details", "brochure", "proposal", "yes",
        "let's talk", "available", "book", "appointment", "consultation"
    ]
    
    WARM_KEYWORDS = [
        "maybe", "perhaps", "later", "next month", "next quarter", "not now",
        "busy", "contact me later", "follow up", "check back", "remind me",
        "think about", "consider", "need time", "reviewing", "evaluating"
    ]
    
    COLD_KEYWORDS = [
        "no thanks", "not interested", "wrong person", "wrong company",
        "already have", "not looking", "not a fit", "decline", "pass",
        "no need", "we're good", "not relevant"
    ]
    
    UNSUBSCRIBE_KEYWORDS = [
        "stop", "unsubscribe", "remove", "opt out", "don't contact",
        "do not contact", "never contact", "spam", "block", "report",
        "harassment", "stop messaging", "remove me", "take me off"
    ]
    
    def __init__(self):
        """Initialize the intent classifier."""
        self._gpt_client = None
    
    @property
    def gpt_client(self):
        """Lazy load GPT client."""
        if self._gpt_client is None:
            try:
                from openai import OpenAI
                from app.database import SessionLocal
                from app.models import SystemConfig
                
                db = SessionLocal()
                config = db.query(SystemConfig).filter(SystemConfig.key == "OPENAI_API_KEY").first()
                api_key = config.value if config else settings.openai_api_key
                db.close()
                
                self._gpt_client = OpenAI(api_key=api_key.strip() if api_key else None)
            except Exception as e:
                print(f"Failed to initialize GPT client for intent classifier: {e}")
                self._gpt_client = None
        return self._gpt_client
    
    def classify_intent(self, reply_text: str, use_gpt: bool = True) -> IntentResult:
        """
        Classify the intent of a reply message.
        
        Args:
            reply_text: The text of the reply to classify
            use_gpt: Whether to attempt GPT classification first
            
        Returns:
            IntentResult with intent type, confidence, and reasons
        """
        if not reply_text or not reply_text.strip():
            return IntentResult(
                intent=IntentType.COLD,
                confidence=0.5,
                reasons=["Empty reply text"]
            )
        
        # Try GPT classification first if enabled
        if use_gpt and self.gpt_client:
            try:
                result = self._classify_with_gpt(reply_text)
                if result:
                    return result
            except Exception as e:
                print(f"GPT classification failed, falling back to keywords: {e}")
        
        # Fallback to keyword matching
        return self._classify_with_keywords(reply_text)
    
    def _classify_with_gpt(self, reply_text: str) -> Optional[IntentResult]:
        """Classify intent using GPT."""
        prompt = f"""You will classify the following reply text into one of these categories:
- "HOT": Direct interest, asked for demo/price/meeting, wants to proceed
- "WARM": Some interest but not ready now, needs follow-up later
- "COLD": No interest but polite decline
- "UNSUBSCRIBE": Explicitly requested to stop receiving messages

Reply text to classify:
\"\"\"{reply_text}\"\"\"

Analyze the sentiment, specific requests, and language used.

Respond ONLY with valid JSON in this exact format:
{{"intent": "HOT", "confidence": 0.92, "reasons": ["asked for demo", "requested pricing"]}}

The confidence should be between 0 and 1. List 1-3 specific reasons for your classification."""

        try:
            response = self.gpt_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an intent classifier for sales replies. Respond only with valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            
            if start_idx == -1 or end_idx == 0:
                return None
            
            json_str = content[start_idx:end_idx]
            data = json.loads(json_str)
            
            intent_str = data.get("intent", "COLD").upper()
            
            # Map string to enum
            intent_map = {
                "HOT": IntentType.HOT,
                "WARM": IntentType.WARM,
                "COLD": IntentType.COLD,
                "UNSUBSCRIBE": IntentType.UNSUBSCRIBE
            }
            
            intent = intent_map.get(intent_str, IntentType.COLD)
            confidence = min(max(float(data.get("confidence", 0.5)), 0.0), 1.0)
            reasons = data.get("reasons", [])
            
            if isinstance(reasons, str):
                reasons = [reasons]
            
            return IntentResult(
                intent=intent,
                confidence=confidence,
                reasons=reasons[:5]  # Limit to 5 reasons
            )
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse GPT response for intent: {e}")
            return None
        except Exception as e:
            print(f"GPT intent classification error: {e}")
            return None
    
    def _classify_with_keywords(self, reply_text: str) -> IntentResult:
        """Classify intent using keyword matching (fallback)."""
        text_lower = reply_text.lower()
        
        # Count matches for each category
        hot_matches = self._count_keyword_matches(text_lower, self.HOT_KEYWORDS)
        warm_matches = self._count_keyword_matches(text_lower, self.WARM_KEYWORDS)
        cold_matches = self._count_keyword_matches(text_lower, self.COLD_KEYWORDS)
        unsubscribe_matches = self._count_keyword_matches(text_lower, self.UNSUBSCRIBE_KEYWORDS)
        
        # Determine intent based on matches
        # Unsubscribe takes priority
        if unsubscribe_matches > 0:
            return IntentResult(
                intent=IntentType.UNSUBSCRIBE,
                confidence=min(0.5 + (unsubscribe_matches * 0.15), 0.95),
                reasons=[f"Matched unsubscribe keywords: {unsubscribe_matches}"]
            )
        
        # Hot intent
        if hot_matches > 0 and hot_matches >= cold_matches:
            return IntentResult(
                intent=IntentType.HOT,
                confidence=min(0.5 + (hot_matches * 0.1), 0.9),
                reasons=[f"Matched interest keywords: {hot_matches}"]
            )
        
        # Warm intent
        if warm_matches > 0 and warm_matches > cold_matches:
            return IntentResult(
                intent=IntentType.WARM,
                confidence=min(0.5 + (warm_matches * 0.1), 0.85),
                reasons=[f"Matched warm keywords: {warm_matches}"]
            )
        
        # Cold intent
        if cold_matches > 0:
            return IntentResult(
                intent=IntentType.COLD,
                confidence=min(0.5 + (cold_matches * 0.1), 0.85),
                reasons=[f"Matched cold keywords: {cold_matches}"]
            )
        
        # Default to cold with low confidence
        return IntentResult(
            intent=IntentType.COLD,
            confidence=0.4,
            reasons=["No clear intent indicators found"]
        )
    
    def _count_keyword_matches(self, text: str, keywords: List[str]) -> int:
        """Count how many keywords match in the text."""
        count = 0
        for keyword in keywords:
            if keyword in text:
                count += 1
        return count
    
    def is_hot_lead(self, reply_text: str) -> bool:
        """Quick check if a reply indicates a hot lead."""
        result = self.classify_intent(reply_text)
        return result.intent == IntentType.HOT
    
    def should_unsubscribe(self, reply_text: str) -> bool:
        """Quick check if a reply requests unsubscription."""
        result = self.classify_intent(reply_text, use_gpt=False)  # Use fast keyword check
        return result.intent == IntentType.UNSUBSCRIBE


# Global instance
intent_classifier = IntentClassifier()
