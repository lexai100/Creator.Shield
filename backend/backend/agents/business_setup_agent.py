"""
Business Setup Agent — Conversational Multi-Turn Guide
Helps Indian content creators formalise their business step-by-step.
This agent is NOT part of the adversarial loop — it is a separate,
single-pass conversational interface backed by the business_licenses ChromaDB collection.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.config import Settings
from backend.models.schemas import (
    BusinessChecklistItem,
    BusinessSetupMessage,
    BusinessSetupResponse,
)
from backend.services.rag_service import RAGService

logger = logging.getLogger(__name__)


BUSINESS_SETUP_SYSTEM_PROMPT = """You are **CreatorShield's Business Setup Assistant** — a friendly, expert guide who helps Indian content creators formally set up their businesses.

## Your Personality
- Warm, encouraging, and practical
- Never overwhelming — ask ONE follow-up question at a time
- Use simple everyday language (no legal jargon, no MBA words)
- Reference real Indian government portals and exact fees
- Be specific — not 'you may need GST', but 'since your revenue is above ₹20 lakh, you need GST registration'
- Structure every response with numbered steps (1. 2. 3.) so it's easy to read

## Your Knowledge Base
You know about:
- Business structures: Sole Proprietorship, LLP, Private Limited Company
- GST registration (thresholds, process, gst.gov.in)
- Udyam/MSME registration (free, instant, udyamregistration.gov.in)
- FSSAI registration (food/nutrition/supplement creators, foscos.fssai.gov.in)
- Trademark registration (protect your creator brand, ipindia.gov.in, ₹4,500/class)
- Professional Tax (state-specific — Karnataka, Maharashtra, etc.)
- Income Tax for creators (TDS under Section 194J, ITR filing, deductible expenses)
- Import-Export Code (for international brand deals, dgft.gov.in, ₹500)
- ASCI compliance (mandatory for all sponsored content)
- CCPA 2022 (misleading endorsement rules for influencers)

## Conversation Flow
Your job is to gather information through natural conversation, then provide a personalised checklist.

Information you need to gather (collect naturally, not as a form):
1. Nature of business (pure content creator vs. selling products/services)
2. Approximate revenue (to determine GST threshold)
3. State/city (for professional tax, Shops Act)
4. Food/nutrition involvement (for FSSAI)
5. International brand deals (for IEC, export of services)
6. Solo or with partners (for LLP vs. sole prop)

## Response Rules
- If you still need information: ask ONE specific follow-up question. End your response with the question.
- If you have enough to give a recommendation: provide a structured checklist.
- When providing the checklist, set is_final: true in your JSON response.
- Keep replies under 150 words. Use numbered points (1. 2. 3.) for any steps.
- The "reply" field must ONLY contain plain readable text — no JSON, no code blocks, no curly braces.

## Output Format
ALWAYS respond with VALID JSON where the "reply" field is plain human-readable text:

For follow-up questions (still gathering info):
{
  "reply": "Got it! Since you're selling spice blends, here's what matters:\n\n1. You'll need FSSAI registration since you're selling food products.\n2. If your revenue crosses ₹20 lakh, GST is also mandatory.\n\nQuick question: Are you selling only within India, or do you get orders from abroad too?",
  "is_final": false,
  "checklist": null,
  "progress_percent": 40
}

For final recommendation (have enough info):
{
  "reply": "Perfect, I have everything I need! Here's your personalised business setup checklist. I've sorted these by priority — start from the top!",
  "is_final": true,
  "progress_percent": 100,
  "checklist": [
    {
      "license_name": "GST Registration",
      "issuing_authority": "Goods and Services Tax Network (GSTN)",
      "when_required": "When annual revenue exceeds ₹20 lakh for services",
      "how_to_apply": "1. Go to gst.gov.in\n2. Click Register Now\n3. Fill form GST REG-01\n4. Upload Aadhaar + PAN + bank proof",
      "estimated_cost": "Free",
      "timeline": "3-7 working days",
      "priority": "required",
      "portal_url": "https://gst.gov.in"
    }
  ]
}

Priority must be: "required" | "recommended" | "optional"

CRITICAL RULES:
1. The "reply" field must be plain readable text only. No JSON. No code. No curly braces.
2. Use line breaks and numbered points in the reply to make it easy to read.
3. Output VALID JSON only — no markdown fences, no text before/after the JSON object."""


class BusinessSetupAgent:
    """
    Conversational Business Setup Agent for Indian content creators.
    Multi-turn conversation that gathers context and produces a personalised
    business registration checklist.
    """

    def __init__(self, config: Settings, rag_service: Optional[RAGService] = None) -> None:
        self.llm = ChatOpenAI(
            model=config.FAST_MODEL,
            base_url=config.GROQ_BASE_URL,
            api_key=config.GROQ_API_KEY,
            temperature=0.5,
            max_tokens=2048,
        )
        self.rag = rag_service
        self._config = config

    async def chat(
        self,
        user_message: str,
        conversation_history: list[BusinessSetupMessage],
        session_id: str,
    ) -> BusinessSetupResponse:
        """
        Process one turn of the business setup conversation.
        Returns a BusinessSetupResponse with reply, is_final flag, and optional checklist.
        """
        # Retrieve relevant knowledge from the business_licenses RAG
        rag_context = ""
        if self.rag:
            knowledge = self.rag.search_business_knowledge(
                query=user_message,
                n_results=4,
            )
            if knowledge:
                rag_context = "\n\n## Relevant Knowledge Base Entries:\n" + "\n\n".join(
                    [k["text"] for k in knowledge]
                )

        # Build the full message history for the LLM
        system_content = BUSINESS_SETUP_SYSTEM_PROMPT
        if rag_context:
            system_content += f"\n\n{rag_context}"

        messages = [SystemMessage(content=system_content)]

        # Add conversation history
        for msg in conversation_history[-10:]:  # Keep last 10 turns for context
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content))

        # Add current user message
        messages.append(HumanMessage(content=user_message))

        # Invoke LLM with retry
        try:
            response = await self._invoke_with_retry(messages)
            return self._parse_response(response.content, session_id)
        except Exception as exc:
            logger.error("BusinessSetupAgent error: %s", exc)
            return BusinessSetupResponse(
                session_id=session_id,
                reply=(
                    "I'm sorry, I ran into a technical issue. Let's try again — "
                    "can you tell me a bit about your creator business?"
                ),
                is_final=False,
                checklist=None,
                progress_percent=0,
            )

    async def _invoke_with_retry(self, messages: list, max_retries: int = 3):
        """Invoke LLM with exponential backoff."""
        import asyncio
        for attempt in range(max_retries):
            try:
                return await self.llm.ainvoke(messages)
            except Exception as e:
                err = str(e)
                if (
                    ("429" in err or "rate" in err.lower() or "too many" in err.lower())
                    and attempt < max_retries - 1
                ):
                    wait = (2 ** attempt) * 5
                    logger.warning(f"Rate limited. Retrying in {wait}s (attempt {attempt + 1})")
                    await asyncio.sleep(wait)
                else:
                    raise
        raise RuntimeError("Max retries exceeded")

    def _parse_response(self, raw: str, session_id: str) -> BusinessSetupResponse:
        """Parse the LLM's JSON response into a BusinessSetupResponse."""
        try:
            content = raw.strip()
            # Strip markdown code fences if present
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:])
                if content.rstrip().endswith("```"):
                    content = content.rstrip()[:-3]

            data = json.loads(content)

            # Guard: ensure reply field is clean plain text, not nested JSON
            reply = data.get("reply", "")
            reply = self._extract_clean_reply(reply)

            checklist = None
            if data.get("is_final") and data.get("checklist"):
                checklist = []
                for item in data["checklist"]:
                    checklist.append(BusinessChecklistItem(
                        license_name=item.get("license_name", ""),
                        issuing_authority=item.get("issuing_authority", ""),
                        when_required=item.get("when_required", ""),
                        how_to_apply=item.get("how_to_apply", ""),
                        estimated_cost=item.get("estimated_cost", ""),
                        timeline=item.get("timeline", ""),
                        priority=item.get("priority", "required"),
                        portal_url=item.get("portal_url", ""),
                    ))

            # Even for non-final turns, extract partial checklist if provided
            elif not data.get("is_final") and data.get("checklist"):
                checklist = []
                for item in data["checklist"]:
                    checklist.append(BusinessChecklistItem(
                        license_name=item.get("license_name", ""),
                        issuing_authority=item.get("issuing_authority", ""),
                        when_required=item.get("when_required", ""),
                        how_to_apply=item.get("how_to_apply", ""),
                        estimated_cost=item.get("estimated_cost", ""),
                        timeline=item.get("timeline", ""),
                        priority=item.get("priority", "recommended"),
                        portal_url=item.get("portal_url", ""),
                    ))

            return BusinessSetupResponse(
                session_id=session_id,
                reply=reply,
                is_final=data.get("is_final", False),
                checklist=checklist,
                progress_percent=data.get("progress_percent", 0),
            )

        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            logger.warning("Failed to parse BusinessSetupAgent JSON: %s", exc)
            # If JSON parsing fails, treat as a text reply
            # but try to clean any JSON-like strings from it
            clean = self._extract_clean_reply(raw[:1000])
            return BusinessSetupResponse(
                session_id=session_id,
                reply=clean,
                is_final=False,
                checklist=None,
                progress_percent=0,
            )

    @staticmethod
    def _extract_clean_reply(text: str) -> str:
        """
        Guard against the LLM embedding raw JSON inside the reply field.
        If the text looks like a JSON object, extract just the 'reply' value from it,
        otherwise return as-is.
        """
        if not text:
            return text
        stripped = text.strip()
        # Detect if the reply itself is a JSON blob
        if stripped.startswith("{") and stripped.endswith("}"):
            try:
                inner = json.loads(stripped)
                if "reply" in inner:
                    return str(inner["reply"])
            except (json.JSONDecodeError, TypeError):
                pass
        return text
