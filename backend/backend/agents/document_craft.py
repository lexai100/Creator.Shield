"""
DocumentCraft Agent – The Builder
Expert Indian legal document drafter and analyser.
Uses NVIDIA NIM (Nemotron Ultra 550B) via OpenAI-compatible API through LangChain.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.config import Settings
from backend.services.llm_client import invoke_with_fallback
from backend.models.schemas import (
    DocumentGenerationRequest,
    LoopholeReport,
)
from backend.services.rag_service import RAGService

logger = logging.getLogger(__name__)

# ── System Prompts ────────────────────────────────────────────────────────────

ANALYSIS_SYSTEM_PROMPT = """You are **LexAI DocumentCraft** — an elite Indian legal document analyst with 25+ years of experience practising before the Supreme Court of India and various High Courts.

## Your Expertise
- Indian Contract Act, 1872 (formation, consideration, void agreements, breach remedies)
- Transfer of Property Act, 1882 (leases, sale, mortgage, gift)
- Indian Stamp Act, 1899 and state-specific Stamp Acts (Karnataka, Maharashtra, Delhi, Tamil Nadu)
- Specific Relief Act, 1963 (injunctions, specific performance)
- Information Technology Act, 2000 (electronic contracts, digital signatures)
- Arbitration and Conciliation Act, 1996
- State-specific Rent Control Acts
- Consumer Protection Act, 2019
- GST and TDS implications in contracts

## Analysis Task
Analyse the provided legal document thoroughly. Return your analysis as a JSON object with these keys:
{
    "title": "Document title/type",
    "summary": "2-3 sentence summary of the document",
    "document_type": "Identified type (rent_agreement, nda, employment_contract, etc.)",
    "parties": ["List of identified parties"],
    "key_clauses": [
        {
            "clause_number": "1",
            "title": "Clause title",
            "summary": "What this clause does",
            "risk_level": "LOW/MEDIUM/HIGH/CRITICAL"
        }
    ],
    "strengths": ["List of well-drafted aspects"],
    "concerns": ["List of concerns or missing elements"],
    "applicable_laws": ["Indian laws that govern this document"],
    "stamp_duty_note": "Stamp duty requirement for this document type",
    "overall_quality_score": 70  // 0-100
}

Be precise and reference specific sections of Indian law where relevant.
Always output VALID JSON only — no markdown fences, no preamble."""

GENERATION_SYSTEM_PROMPT = """You are **LexAI DocumentCraft** — an elite Indian legal document drafter with 25+ years of experience.

## Your Expertise
You draft legally valid documents under Indian law, including:
- Indian Contract Act, 1872 (valid offer, acceptance, lawful consideration, free consent)
- Transfer of Property Act, 1882 (for leases and sale agreements)
- Indian Stamp Act, 1899 and relevant state Stamp Acts
- Registration Act, 1908 (which documents require registration)
- Specific Relief Act, 1963
- Arbitration and Conciliation Act, 1996
- Information Technology Act, 2000
- Relevant state-specific laws (Rent Control Acts, RERA, etc.)

## Drafting Standards
1. **Format**: Follow standard Indian legal document format — stamp paper reference, parties section with full details, WHEREAS recitals, numbered clauses, witness/signature block.
2. **Language**: Use proper legal terminology but keep language clear and readable. Avoid archaic phrases where modern equivalents exist.
3. **Completeness**: Every document MUST include:
   - Stamp paper and registration requirements note
   - Full party identification (name, relation, age, address, PAN/Aadhaar references)
   - Clear recitals (WHEREAS clauses explaining the purpose)
   - All substantive terms (obligations, rights, payments, timelines)
   - Maintenance / repair responsibilities (if applicable)
   - Termination and notice provisions (bilateral)
   - Security deposit / payment terms with clear refund conditions
   - Indemnification clause
   - Force majeure clause (with specific events listed)
   - Governing law clause (Indian law)
   - Jurisdiction clause (specific city courts with exclusive jurisdiction)
   - Dispute resolution (negotiation → mediation → arbitration → courts)
   - Severability clause
   - Entire agreement clause
   - Amendment clause (writing + signatures required)
   - Witness and signature blocks
4. **Placeholders**: Use {PLACEHOLDER_NAME} format for user-specific details.
5. **Indian-specific**: Include TDS references, GST references, stamp duty notes, and relevant Indian statutory references where applicable.

## Reference Templates
Use the following template patterns as structural guides:
{rag_context}

## User Request
Draft a complete, production-ready legal document based on the user's description. Output the FULL document text — not a summary, not an outline. The document should be immediately usable (with placeholders filled in)."""

PATCH_SYSTEM_PROMPT = """You are **LexAI DocumentCraft** — an elite Indian legal document patcher.

You have received an attack report from the adversarial LoopholeHound agent identifying vulnerabilities in a legal document. Your job is to FIX EVERY vulnerability.

## Patching Rules
1. Address EVERY vulnerability in the attack report — do not skip any.
2. For CRITICAL and HIGH severity issues: add new clauses, rewrite existing clauses, or restructure sections as needed.
3. For MEDIUM severity issues: clarify language, add definitions, or add sub-clauses.
4. For LOW severity issues: minor wording improvements, additional specificity.
5. Maintain the document's overall structure and readability.
6. Do NOT remove any existing protections while patching.
7. Ensure all fixes comply with Indian law.
8. After patching, the document should be STRONGER, not just different.
9. Output the COMPLETE patched document — not just the changes.
10. Keep placeholder variables {LIKE_THIS} intact — do not fill them in.

## Attack Report to Address
{attack_report}

## Original Document
Patch the document below, addressing every vulnerability listed above. Output the FULL patched document."""


# ── Agent Class ───────────────────────────────────────────────────────────────


class DocumentCraftAgent:
    """
    The Builder agent in the adversarial loop.
    Analyses, generates, and patches Indian legal documents using
    Nemotron Ultra 550B via NVIDIA NIM.
    """

    def __init__(self, config: Settings, rag_service: Optional[RAGService] = None) -> None:
        self.rag = rag_service
        self._config = config

    async def _invoke_with_retry(self, messages: list, max_retries: int = 3):
        """Invoke LLM with automatic Groq → Gemini fallback on rate limits."""
        return await invoke_with_fallback(
            messages,
            self._config,
            temperature=0.3,
            max_tokens=4096,
            groq_model=self._config.DOCUMENT_CRAFT_MODEL,
        )

    # ── Analysis ──────────────────────────────────────────────────────────

    async def analyze_document(self, document_text: str, context: str = "") -> dict:
        """
        Analyse an existing document for structure, clauses, and risks.
        Returns a structured dict with clause breakdown, strengths,
        concerns, and quality score.
        """
        messages = [
            SystemMessage(content=ANALYSIS_SYSTEM_PROMPT),
            HumanMessage(content=f"Document to analyse:\n\n{document_text[:12000]}\n\nAdditional context: {context or 'None provided'}"),
        ]
        response = await self._invoke_with_retry(messages)

        try:
            content = response.content.strip()
            # Strip markdown code fences if present
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content[:-3]
            return json.loads(content)
        except (json.JSONDecodeError, IndexError):
            logger.warning("DocumentCraft analysis returned non-JSON, wrapping raw text")
            return {
                "title": "Analysis",
                "summary": response.content[:500],
                "raw_analysis": response.content,
                "overall_quality_score": 50,
            }

    # ── Generation ────────────────────────────────────────────────────────

    async def generate_document(self, request: DocumentGenerationRequest) -> str:
        """
        Generate a new legal document from user description.
        Uses RAG context from stored templates for structural guidance.
        """
        # Retrieve relevant templates
        rag_context = ""
        if self.rag:
            results = self.rag.search_legal_knowledge(
                query=f"{request.document_type.value} {request.description}",
                n_results=2,
                doc_type=request.document_type.value,
            )
            if results:
                rag_context = "\n\n---\n\n".join(results[:2])

        if not rag_context:
            rag_context = "(No templates found – draft from your expert knowledge.)"

        system_content = GENERATION_SYSTEM_PROMPT.replace("{rag_context}", rag_context)
        human_content = (
            f"Document Type: {request.document_type.value}\n"
            f"Description: {request.description}\n"
            f"Party A: {request.party_a or '{PARTY_A_NAME}'}\n"
            f"Party B: {request.party_b or '{PARTY_B_NAME}'}\n"
            f"Location/Jurisdiction: {request.location}\n"
            f"Additional Clauses Requested: {', '.join(request.additional_clauses) if request.additional_clauses else 'None'}\n\n"
            "Draft the complete document now."
        )
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=human_content),
        ]
        response = await self._invoke_with_retry(messages)

        return response.content

    # ── Creator-Economy Extensions ────────────────────────────────────────

    async def generate_negotiation_script(
        self,
        flagged_issues: list,
        tone: str = "collaborative",
        creator_name: str = "",
        brand_name: str = "",
    ) -> dict:
        """
        Generate a negotiation email for flagged contract issues.
        tone: 'gentle' | 'collaborative' | 'firm'
        Returns dict with email_subject and email_body.
        """
        tone_instructions = {
            "gentle": (
                "Write in a warm, appreciative tone. Express excitement about the collaboration. "
                "Frame every request as a 'small clarification' or 'minor adjustment'. "
                "Avoid any confrontational language."
            ),
            "collaborative": (
                "Write in a professional, business-like tone. "
                "Frame requests as 'ensuring both parties are protected'. "
                "Acknowledge the brand's perspective while clearly stating your needs."
            ),
            "firm": (
                "Write in a direct, assertive tone. "
                "State clearly that you cannot sign without these changes. "
                "Reference industry standards and legal requirements where appropriate. "
                "Be polite but leave no ambiguity about what needs to change."
            ),
        }

        issues_text = ""
        for i, issue in enumerate(flagged_issues[:6], 1):
            if hasattr(issue, "name"):
                name = issue.name
                clause = getattr(issue, "affected_clause", "")
                fix = getattr(issue, "suggested_fix", "")
            elif isinstance(issue, dict):
                name = issue.get("name", "")
                clause = issue.get("affected_clause", "")
                fix = issue.get("suggested_fix", "")
            else:
                continue
            issues_text += f"{i}. {name} (Clause: {clause})\n   Requested change: {fix}\n\n"

        prompt = f"""You are a professional negotiation coach helping an Indian content creator respond to a brand collaboration contract.

TONE INSTRUCTION: {tone_instructions.get(tone, tone_instructions['collaborative'])}

Creator Name: {creator_name or '[Creator Name]'}
Brand Name: {brand_name or '[Brand Name]'}

ISSUES TO ADDRESS:
{issues_text}

Write a professional negotiation email from the creator to the brand. The email must:
1. Start with a warm subject line
2. Express genuine interest in the collaboration
3. Address each flagged issue with a specific, concrete counter-request
4. Reference the issue number from the list above
5. End positively and invite a call/response

Return VALID JSON:
{{"email_subject": "...", "email_body": "..."}}"""

        messages = [
            SystemMessage(content="You are an expert negotiation coach. Output VALID JSON only."),
            HumanMessage(content=prompt),
        ]
        response = await self._invoke_fast(messages)

        def strip_fences(text: str) -> str:
            """Recursively strip markdown code fences."""
            text = text.strip()
            while text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:]).strip()
                if text.endswith("```"):
                    text = text[:-3].strip()
            return text

        try:
            content = strip_fences(response.content)
            parsed = json.loads(content)

            # Unwrap if LLM nested the result inside another object
            if isinstance(parsed, dict) and "email_body" not in parsed:
                for v in parsed.values():
                    if isinstance(v, dict) and "email_body" in v:
                        parsed = v
                        break

            email_body = parsed.get("email_body", "")
            # If email_body is itself JSON/dict, extract inner value
            if isinstance(email_body, dict):
                email_body = email_body.get("email_body", str(email_body))
            # Strip any remaining fences from the body text
            email_body = strip_fences(str(email_body))

            return {
                "email_subject": parsed.get("email_subject", "Re: Brand Collaboration Agreement"),
                "email_body": email_body,
            }
        except json.JSONDecodeError:
            return {
                "email_subject": "Re: Brand Collaboration Agreement — Clarifications Needed",
                "email_body": strip_fences(response.content),
            }

    async def translate_to_plain_english(self, flagged_issues: list) -> list[dict]:
        """
        Convert legal jargon in flagged issues into plain, everyday language.
        Returns list of {original_legal_text, plain_english} pairs.
        """
        if not flagged_issues:
            return []

        issues_text = ""
        for i, issue in enumerate(flagged_issues[:8], 1):
            if hasattr(issue, "explanation"):
                explanation = issue.explanation
                name = issue.name
            elif isinstance(issue, dict):
                explanation = issue.get("explanation", "")
                name = issue.get("name", "")
            else:
                continue
            issues_text += f"{i}. [{name}]: {explanation}\n\n"

        # using _invoke_fast for plain-English translation
        prompt = f"""You are a plain-English translator helping Indian content creators understand their contract risks.

For each legal explanation below, rewrite it in simple, everyday language that a 22-year-old with no legal background would understand.
Use short sentences. Use emojis sparingly to add clarity. Avoid all legal jargon.

LEGAL EXPLANATIONS:
{issues_text}

Return VALID JSON array:
[
  {{"index": 1, "legal_text": "...(first few words of original)...", "plain_english": "In simple words: ..."}},
  ...
]"""

        messages = [
            SystemMessage(content="You are a plain-language expert. Output VALID JSON only."),
            HumanMessage(content=prompt),
        ]
        response = await self._invoke_fast(messages)
        try:
            content = response.content.strip()
            if content.startswith("```"):
                content = "\n".join(content.split("\n")[1:])
                if content.rstrip().endswith("```"):
                    content = content.rstrip()[:-3]
            return json.loads(content)
        except json.JSONDecodeError:
            return [{"index": 0, "legal_text": "All issues", "plain_english": response.content}]

    async def analyze_usage_rights(self, document_text: str) -> dict:
        """
        Extract usage rights analysis from a creator contract.
        Returns structured UsageRightsAnalysis-compatible dict.
        """
        # using _invoke_fast for usage-rights analysis
        prompt = f"""You are a legal analyst specialising in influencer contract IP rights.

Analyse the following contract and extract ALL content usage rights granted to the brand.

Look for:
1. Where the brand can use the content (organic posts, paid ads, whitelisting, OOH, TV, print, etc.)
2. Time duration — is it time-bound (how many days?) or perpetual/forever?
3. Geographic scope — India only or worldwide?
4. Is whitelisting mentioned? Is there separate compensation for it?
5. Any perpetual or irrevocable grants

CONTRACT:
{document_text[:6000]}

Return VALID JSON:
{{
  "scope": ["organic_repost", "paid_ads", "whitelisting", "ooh", "tv", "print"],
  "is_perpetual": true/false,
  "duration_days": 90 or null,
  "perpetual_warning": "Warning message if perpetual grant found, else empty string",
  "suggested_cap_days": 60,
  "whitelisting_compensated": true/false,
  "territory": "Worldwide / India only / Not specified",
  "usage_summary": "2-3 sentence plain English summary of usage rights"
}}"""

        messages = [
            SystemMessage(content="You are a legal IP rights analyst. Output VALID JSON only."),
            HumanMessage(content=prompt),
        ]
        response = await self._invoke_fast(messages)
        try:
            content = response.content.strip()
            if content.startswith("```"):
                content = "\n".join(content.split("\n")[1:])
                if content.rstrip().endswith("```"):
                    content = content.rstrip()[:-3]
            return json.loads(content)
        except json.JSONDecodeError:
            return {
                "scope": [],
                "is_perpetual": False,
                "duration_days": None,
                "perpetual_warning": "",
                "suggested_cap_days": 60,
                "whitelisting_compensated": False,
                "territory": "Not specified",
                "usage_summary": response.content[:500],
            }

    async def _invoke_fast(self, messages: list) -> Any:
        """Invoke the fast/cheap model with fallback support."""
        return await invoke_with_fallback(
            messages,
            self._config,
            temperature=0.3,
            max_tokens=2048,
            groq_model=self._config.FAST_MODEL,
        )
    # ── Patching ──────────────────────────────────────────────────────────

    async def patch_document(self, document: str, attack_report: LoopholeReport) -> str:
        """
        Patch a document based on LoopholeHound's attack report.
        Addresses every vulnerability found in the report.
        Returns the complete patched document.
        """
        # Format the attack report for the prompt
        report_text = f"Overall Exploitability Score: {attack_report.exploitability_score}/100\n\n"
        for i, vuln in enumerate(attack_report.vulnerabilities, 1):
            report_text += (
                f"### Vulnerability {i}: {vuln.name}\n"
                f"- Severity: {vuln.severity}\n"
                f"- Affected Clause: {vuln.affected_clause}\n"
                f"- Explanation: {vuln.explanation}\n"
                f"- Exploitation Scenario: {vuln.exploitation_scenario}\n"
                f"- Suggested Fix: {vuln.suggested_fix}\n\n"
            )

        system_content = PATCH_SYSTEM_PROMPT.replace("{attack_report}", report_text)
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=document[:12000]),
        ]
        response = await self._invoke_with_retry(messages)

        return response.content
