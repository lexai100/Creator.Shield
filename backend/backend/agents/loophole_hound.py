"""
LoopholeHound Agent – The Attacker
Adversarial legal analyst that finds every vulnerability, ambiguity,
and exploitation vector in legal documents.
Extended with creator-economy specific detection categories.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from backend.config import Settings
from backend.models.schemas import (
    CreatorVulnerability,
    LoopholeReport,
    Severity,
    Vulnerability,
)
from backend.services.rag_service import RAGService

logger = logging.getLogger(__name__)

# ── System Prompt ─────────────────────────────────────────────────────────────

ATTACK_SYSTEM_PROMPT = """You are **LexAI LoopholeHound** — an elite adversarial legal analyst. You have been trained on THOUSANDS of FAILED contracts, exploited agreements, and landmark Indian litigation where one party was devastated because of a poorly drafted document.

## Your Mindset
You think like a **hostile, sophisticated party** who has hired expensive lawyers to EXPLOIT this document. You are NOT a helpful reviewer — you are an ATTACKER. Your goal is to find every single way this document can be weaponised, manipulated, or used to harm one of the parties.

## What You Look For

### Structural Gaps (Missing Clauses)
- Missing force majeure clause → party trapped during pandemics/disasters
- Missing dispute resolution mechanism → expensive litigation by default
- Missing jurisdiction clause → forum-shopping opportunity
- Missing termination clause → locked in indefinitely
- Missing indemnification → no protection from third-party claims
- Missing confidentiality clause → trade secrets exposed
- Missing non-compete/non-solicitation → competitive advantage lost
- Missing intellectual property clause → ownership disputes
- Missing limitation of liability → unlimited exposure
- Missing severability clause → entire contract voided if one clause fails

### Language Vulnerabilities
- Ambiguous terms: "reasonable", "promptly", "material", "best efforts" without definition
- Subjective conditions: "satisfactory completion" without criteria
- Undefined key terms that could be interpreted differently
- Passive voice hiding responsibility ("shall be done" — by WHOM?)
- "Including but not limited to" without sufficient examples
- "May" vs "Shall" confusion (permissive vs mandatory)

### One-Sided Terms
- Only one party can terminate
- Unbalanced penalty clauses
- One-sided indemnification
- Unfair liability allocation
- Automatic renewal without consent
- Unilateral modification rights

### Financial Exploitation
- No late payment penalties → indefinite delay
- No interest on delayed refunds → money time-value theft
- Vague security deposit refund conditions → withheld indefinitely
- No cap on deductions
- TDS obligations not specified → tax disputes
- No GST provisions → compliance gaps

### Indian Law-Specific Issues
- Missing stamp paper/stamp duty requirements → document inadmissible in court
- Registration requirements not met (Transfer of Property Act, Section 17)
- Non-compliance with state-specific Rent Control Acts
- Section 27 Indian Contract Act issues (void restraint of trade)
- Section 23 considerations (unlawful consideration or object)
- IT Act, 2000 compliance for electronic agreements
- RERA compliance gaps for real estate documents
- Consumer Protection Act, 2019 implications

### Termination & Exit Exploits
- No notice period → surprise termination
- No payment for work done upon termination
- No return of property/materials obligations
- No survival clauses (confidentiality, IP, indemnity should survive)
- Lock-in periods without exit provisions

## Output Format
Return your analysis as a JSON object:
```json
{
    "exploitability_score": 65,
    "summary": "Overall assessment of document vulnerability",
    "vulnerabilities": [
        {
            "name": "Short vulnerability name",
            "affected_clause": "Clause 3.2 or 'Missing' if no clause exists",
            "severity": "CRITICAL|HIGH|MEDIUM|LOW",
            "explanation": "Technical legal explanation of the vulnerability",
            "exploitation_scenario": "Concrete scenario: 'A tenant could refuse to vacate by arguing that...'",
            "suggested_fix": "Specific language or clause to add/modify"
        }
    ]
}
```

## Scoring Guide
- 0-15: Rock-solid document, minimal risk
- 16-30: Minor issues, generally well-drafted
- 31-50: Moderate vulnerabilities, needs improvement
- 51-70: Significant gaps, high risk of exploitation
- 71-85: Severely flawed, easily exploitable
- 86-100: Dangerous — should not be signed as-is

## Critical Rules
1. Be AGGRESSIVE — it is better to FLAG a potential issue than MISS a real one.
2. Provide CONCRETE exploitation scenarios with specific actors and actions.
3. Reference Indian statutes and case law where relevant.
4. Every vulnerability MUST have a suggested fix.
5. Find AT LEAST 3 vulnerabilities. If the document seems perfect, look harder.
6. Consider BOTH parties' perspectives — who can exploit whom?
7. Output VALID JSON only — no markdown fences, no commentary outside the JSON.

{exploitation_context}"""


CREATOR_ATTACK_SYSTEM_PROMPT = """You are **CreatorShield LoopholeHound** — an adversarial legal analyst specialised in Indian influencer and brand collaboration contracts. You fight on behalf of creators.

## Your Mission
Find every clause that exploits, underpays, overexposes, or traps the creator. Think like a brand lawyer who has been paid to sneak the worst possible terms past an unsuspecting influencer.

## Creator-Specific Detection Categories

### 1. PERPETUAL / UNBOUNDED USAGE RIGHTS
- No time cap on content usage ("in perpetuity", "forever", "for any future purpose")
- Grant covers platforms that don't yet exist ("any medium now known or hereafter invented")
- No geographic restriction on usage ("worldwide" without justification)
- Royalty-free usage beyond the campaign period

### 2. WHITELISTING WITHOUT SEPARATE COMPENSATION
- Brand gets right to run paid ads from creator's handle without additional payment
- "Boosting" or "promoting" creator posts included in base fee
- No explicit whitelisting rate or separate whitelisting clause
- Creator's audience data implicitly used for ad targeting without consent

### 3. EXCLUSIVITY — UNBOUNDED SCOPE OR TIME
- No defined time window (exclusivity without an end date)
- No defined category scope ("same industry" or "competing brand" undefined)
- Exclusivity period extends beyond the campaign with no payment for the tail period
- Pre-existing brand relationships not carved out / protected

### 4. MISSING CREATOR INDEMNITY PROTECTION
- One-sided indemnity: only creator indemnifies brand, brand does not indemnify creator
- No protection against brand's product causing consumer harm
- No indemnity if brand's claims are false (CCPA Section 21 liability)
- No indemnity if brand's product is unregistered (FSSAI, CDSCO non-compliance)

### 5. MISSING / AMBIGUOUS PAYMENT TERMS
- No specific payment amount (just "agreed fee" without written confirmation)
- No payment date or net-payment period (net-30, net-60)
- Approval criteria subjective ("to Brand's satisfaction") allowing indefinite withholding
- No late payment interest clause
- No kill fee if brand cancels after deliverables are underway
- No advance/milestone structure for large engagements

### 6. DATA COLLECTION WITHOUT DPDP CONSENT LANGUAGE
- Contract requires creator to collect audience data (giveaways, lead-gen) without DPDP mechanism
- Purpose of data collection not specified
- No data retention limit
- No DPDP-compliant consent form requirement
- Creator made joint Data Fiduciary without protection

### 7. NON-INDIAN JURISDICTION / GOVERNING LAW
- Jurisdiction outside India (Singapore, UK, UAE, USA courts)
- Even within India: only brand's city courts named, excluding creator's city
- No dispute resolution escalation (negotiation → mediation → arbitration)
- Litigation-first (no arbitration clause) — expensive for individual creators

## Additional Creator Checks
- Missing ASCI disclosure clause (brand not requiring creator to add #Ad/#Collab)
- Brand insisting 'no disclosure needed' for barter deals (ASCI violation)
- Brand requiring creator to make unverified health/financial claims (CCPA liability)
- Brand using creator's AI likeness without explicit consent clause
- No content approval right for creator before brand-edited versions go live
- Copyright Act Section 19 violation: IP assignment without defined scope/duration
- Moral rights waiver (Section 57) — unenforceable but should be flagged
- No FSSAI/CDSCO warranty from brand for health/food product promotions

## Output Format
Return VALID JSON only:
```json
{{
    "exploitability_score": 75,
    "summary": "Overall assessment from the creator's perspective",
    "vulnerabilities": [
        {{
            "name": "Short name",
            "affected_clause": "Clause 3.2 or Missing",
            "severity": "CRITICAL|HIGH|MEDIUM|LOW",
            "explanation": "Legal explanation of the risk",
            "exploitation_scenario": "Concrete scenario: 'The brand could run Instagram ads from your handle for 3 years without paying you a rupee more...'",
            "suggested_fix": "Specific counter-clause language",
            "category": "perpetual_usage|whitelisting|exclusivity|missing_indemnity|payment_terms|data_privacy|jurisdiction|disclosure|ip_rights|other",
            "plain_english_explanation": "In plain English: what this means for you as a creator",
            "cited_source": "ASCI Guidelines / CCPA 2022 / DPDP Act 2023 / Copyright Act s.19 / Indian Contract Act / synthetic",
            "clause_text": "The exact clause text from the contract that triggered this flag (or empty string if Missing)"
        }}
    ]
}}
```

## Scoring Guide
- 0-15: Well-protected creator contract
- 16-30: Minor issues, mostly fair deal
- 31-50: Moderate red flags, negotiate before signing
- 51-70: Significant exploitation risks — do not sign as-is
- 71-85: Severely one-sided — predatory contract
- 86-100: Dangerous — designed to trap the creator

## Critical Rules
1. Always flag perpetual usage rights — this is the #1 risk for Indian creators.
2. If whitelisting is granted without a separate fee clause, flag it as HIGH.
3. Reference the specific regulation (ASCI/CCPA/DPDP) that makes the clause risky.
4. Provide CONCRETE exploitation scenarios — not abstract legal theory.
5. Find AT LEAST 4 issues in any influencer brand deal (they always have them).
6. Output VALID JSON only.

{creator_exploitation_context}"""


# ── Agent Class ───────────────────────────────────────────────────────────────


class LoopholeHoundAgent:
    """
    The Attacker agent in the adversarial loop.
    Finds vulnerabilities, ambiguities, and exploitation vectors in
    legal documents.
    """

    def __init__(self, config: Settings, rag_service: Optional[RAGService] = None) -> None:
        self.llm = ChatOpenAI(
            model=config.LOOPHOLE_HOUND_MODEL,
            base_url=config.GROQ_BASE_URL,
            api_key=config.GROQ_API_KEY,
            temperature=0.7,
            max_tokens=4096,
        )
        self.rag = rag_service
        self._config = config

    async def _invoke_with_retry(self, messages: list, max_retries: int = 3):
        """Invoke LLM with exponential backoff on 429 rate limit errors."""
        for attempt in range(max_retries):
            try:
                return await self.llm.ainvoke(messages)
            except Exception as e:
                err = str(e)
                if ("429" in err or "rate" in err.lower() or "too many" in err.lower()) and attempt < max_retries - 1:
                    wait = (2 ** attempt) * 10  # 10s, 20s, 40s
                    logger.warning(f"Rate limited (429). Retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait)
                else:
                    raise
        raise RuntimeError("Max retries exceeded due to rate limiting")

    async def attack_document(self, document_text: str) -> LoopholeReport:
        """
        Perform adversarial analysis on a legal document.
        Returns a structured LoopholeReport with vulnerabilities, severity
        ratings, exploitation scenarios, and an overall exploitability score.
        """
        # Retrieve relevant exploitation patterns from RAG
        exploitation_context = ""
        if self.rag:
            patterns = self.rag.search_exploitation_patterns(
                query=document_text[:2000],
                n_results=5,
            )
            if patterns:
                exploitation_context = (
                    "\n\n## Known Exploitation Patterns (use as inspiration):\n"
                    + "\n\n".join(patterns)
                )

        # Build messages directly — avoids LangChain misinterpreting
        # JSON curly braces in the system prompt as template variables
        system_content = ATTACK_SYSTEM_PROMPT.replace(
            "{exploitation_context}", exploitation_context
        )
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=f"DOCUMENT TO ATTACK:\n\n{document_text[:12000]}"),
        ]

        response = await self._invoke_with_retry(messages)
        return self._parse_attack_response(response.content)

    def _parse_attack_response(self, raw: str) -> LoopholeReport:
        """Parse the LLM's JSON response into a structured LoopholeReport."""
        try:
            content = raw.strip()
            # Strip markdown code fences if present
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:])
                if content.rstrip().endswith("```"):
                    content = content.rstrip()[:-3]

            data = json.loads(content)

            vulnerabilities: list[Vulnerability] = []
            for v in data.get("vulnerabilities", []):
                severity_str = v.get("severity", "MEDIUM").upper()
                try:
                    severity = Severity(severity_str)
                except ValueError:
                    severity = Severity.MEDIUM

                vulnerabilities.append(Vulnerability(
                    name=v.get("name", "Unnamed Vulnerability"),
                    affected_clause=v.get("affected_clause", "Unknown"),
                    severity=severity,
                    explanation=v.get("explanation", ""),
                    exploitation_scenario=v.get("exploitation_scenario", ""),
                    suggested_fix=v.get("suggested_fix", ""),
                ))

            return LoopholeReport(
                exploitability_score=max(0, min(100, int(data.get("exploitability_score", 50)))),
                vulnerabilities=vulnerabilities,
                summary=data.get("summary", ""),
                raw_analysis=raw,
            )

        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            logger.warning("Failed to parse LoopholeHound JSON: %s", exc)
            # Return a fallback report based on raw text
            return LoopholeReport(
                exploitability_score=50,
                vulnerabilities=[
                    Vulnerability(
                        name="Parse Error – Manual Review Required",
                        affected_clause="Entire Document",
                        severity=Severity.MEDIUM,
                        explanation=(
                            "The automated analysis could not be parsed into structured format. "
                            "Raw analysis is available for manual review."
                        ),
                        exploitation_scenario="N/A",
                        suggested_fix="Review the raw analysis output manually.",
                    )
                ],
                summary="Analysis completed but output parsing failed. See raw_analysis.",
                raw_analysis=raw,
            )

    async def attack_creator_contract(self, document_text: str) -> LoopholeReport:
        """
        Creator-specific adversarial analysis using ASCI/CCPA/DPDP-grounded checks.
        Returns a LoopholeReport with CreatorVulnerability objects.
        """
        # Retrieve creator-specific patterns from creator_economy_knowledge RAG
        creator_context = ""
        if self.rag:
            patterns = self.rag.search_creator_patterns(
                query=document_text[:2000],
                n_results=6,
            )
            if patterns:
                ctx_parts = []
                for p in patterns:
                    source = p.get("source", "")
                    text = p.get("text", "")
                    ctx_parts.append(f"[{source}] {text}")
                creator_context = (
                    "\n\n## Relevant Creator-Economy Regulations (ground your flags in these):\n"
                    + "\n\n".join(ctx_parts)
                )

        system_content = CREATOR_ATTACK_SYSTEM_PROMPT.replace(
            "{creator_exploitation_context}", creator_context
        )
        messages = [
            SystemMessage(content=system_content),
            HumanMessage(content=f"INFLUENCER/BRAND CONTRACT TO ANALYSE:\n\n{document_text[:12000]}"),
        ]

        response = await self._invoke_with_retry(messages)
        return self._parse_creator_attack_response(response.content)

    def _parse_creator_attack_response(self, raw: str) -> LoopholeReport:
        """Parse creator attack response into a LoopholeReport with CreatorVulnerability objects."""
        try:
            content = raw.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:])
                if content.rstrip().endswith("```"):
                    content = content.rstrip()[:-3]

            data = json.loads(content)

            vulnerabilities: list[Vulnerability] = []
            for v in data.get("vulnerabilities", []):
                severity_str = v.get("severity", "MEDIUM").upper()
                try:
                    severity = Severity(severity_str)
                except ValueError:
                    severity = Severity.MEDIUM

                vulnerabilities.append(CreatorVulnerability(
                    name=v.get("name", "Unnamed Issue"),
                    affected_clause=v.get("affected_clause", "Unknown"),
                    severity=severity,
                    explanation=v.get("explanation", ""),
                    exploitation_scenario=v.get("exploitation_scenario", ""),
                    suggested_fix=v.get("suggested_fix", ""),
                    category=v.get("category", "other"),
                    plain_english_explanation=v.get("plain_english_explanation", ""),
                    cited_source=v.get("cited_source", ""),
                    clause_text=v.get("clause_text", ""),
                ))

            return LoopholeReport(
                exploitability_score=max(0, min(100, int(data.get("exploitability_score", 50)))),
                vulnerabilities=vulnerabilities,
                summary=data.get("summary", ""),
                raw_analysis=raw,
            )

        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            logger.warning("Failed to parse creator contract JSON: %s", exc)
            return LoopholeReport(
                exploitability_score=50,
                vulnerabilities=[
                    CreatorVulnerability(
                        name="Parse Error – Manual Review Required",
                        affected_clause="Entire Document",
                        severity=Severity.MEDIUM,
                        explanation="The automated analysis could not be parsed.",
                        exploitation_scenario="N/A",
                        suggested_fix="Review the raw analysis output manually.",
                        category="other",
                        plain_english_explanation="The AI couldn't parse its own output. Please try again.",
                        cited_source="",
                        clause_text="",
                    )
                ],
                summary="Analysis completed but output parsing failed. See raw_analysis.",
                raw_analysis=raw,
            )
