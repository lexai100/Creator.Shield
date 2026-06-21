"""
ScamDetectorAgent — Detects fraudulent brand deal emails targeting Indian creators.
Specialized for Indian creator-economy scam patterns.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from backend.services.llm_client import invoke_with_fallback

logger = logging.getLogger("lexai.scam_detector")

SCAM_DETECTION_SYSTEM = """You are ScamShield, an AI expert in detecting fraudulent brand deal emails targeting Indian content creators (YouTubers, Instagrammers, influencers, podcasters).

## Common Indian Creator Scam Patterns:
1. **Brand impersonation** — Gmail/Yahoo/Hotmail address claiming to be Amazon, Flipkart, Myntra, Nykaa etc.
2. **Upfront fee requests** — "Pay ₹500-2000 registration/security fee to confirm the collaboration"
3. **Unrealistic pay** — "₹50,000 for one story, no fixed deliverables, respond in 24 hours"
4. **Vague deliverables** — No clear content requirements, deadlines, or approval process
5. **Urgency pressure** — "Last 2 slots remaining", "Offer expires today", "Reply urgently"
6. **Personal data harvesting** — Aadhaar, PAN, bank account, UPI ID requested before any contract
7. **MLM/pyramid elements** — "Refer 3 more creators and earn extra ₹5000"
8. **Suspicious payment** — UPI to personal number, Google Pay, crypto, gift cards
9. **No verifiable identity** — No LinkedIn, no official website, no company registration mentioned
10. **Poor professionalism** — Copy-paste template, grammar issues, no brand logo/signature
11. **Free product only** — Expensive collaborations offered for just "free products" with no cash
12. **Whatsapp-only communication** — Insist on moving to WhatsApp immediately

## Output JSON (EXACTLY this format, no markdown, no extra text):
{
  "scam_score": <integer 0-100, where 100 = definitely a scam>,
  "verdict": "<DEFINITELY_SCAM | LIKELY_SCAM | SUSPICIOUS | POSSIBLY_LEGIT | LIKELY_LEGIT>",
  "red_flags": [
    {
      "flag": "<short description of the red flag>",
      "severity": "<HIGH | MEDIUM | LOW>",
      "quote": "<exact text from email that triggered this, or empty string>"
    }
  ],
  "safe_signals": ["<things about this email that look legitimate>"],
  "recommendation": "<one clear, actionable sentence telling the creator what to do>",
  "summary": "<2-3 sentence plain English summary a creator can understand>"
}"""


class ScamDetectorAgent:
    """Analyzes brand deal emails for scam indicators."""

    def __init__(self, config: Any):
        self.config = config

    async def analyze(self, email_text: str, sender_email: str = "") -> dict:
        """
        Analyze an email for scam indicators.

        Args:
            email_text: The full email body text.
            sender_email: The sender's email address (optional but improves detection).

        Returns:
            Dict with scam_score, verdict, red_flags, safe_signals, recommendation, summary.
        """
        sender_info = f"Sender email: {sender_email}" if sender_email else "Sender email: not provided"

        user_prompt = f"""Analyze the following brand deal email for scam indicators targeting an Indian content creator.

{sender_info}

Email content:
---
{email_text[:4000]}
---

Return ONLY valid JSON. No markdown code blocks, no explanation, no text outside the JSON object."""

        messages = [
            SystemMessage(content=SCAM_DETECTION_SYSTEM),
            HumanMessage(content=user_prompt),
        ]

        try:
            response = await invoke_with_fallback(
                messages, self.config, temperature=0.1, max_tokens=1024
            )
            raw = response.content.strip()

            # Strip markdown code fences if the model wrapped it
            if raw.startswith("```"):
                parts = raw.split("```")
                raw = parts[1] if len(parts) > 1 else raw
                if raw.startswith("json"):
                    raw = raw[4:]

            result = json.loads(raw.strip())

            # Ensure all expected fields exist with fallbacks
            return {
                "scam_score": int(result.get("scam_score", 50)),
                "verdict": result.get("verdict", "SUSPICIOUS"),
                "red_flags": result.get("red_flags", []),
                "safe_signals": result.get("safe_signals", []),
                "recommendation": result.get("recommendation", "Review this email carefully before responding."),
                "summary": result.get("summary", "Analysis complete."),
            }

        except json.JSONDecodeError as e:
            logger.error("Scam detector JSON parse error: %s | raw: %s", e, response.content[:200])
            return {
                "scam_score": 50,
                "verdict": "SUSPICIOUS",
                "red_flags": [],
                "safe_signals": [],
                "recommendation": "We couldn't fully analyze this email. Share it with a trusted person before responding.",
                "summary": "Analysis encountered a parsing error. The email's content may be unusual. Be cautious.",
            }
        except Exception as e:
            logger.exception("Scam detector analysis failed: %s", e)
            raise
