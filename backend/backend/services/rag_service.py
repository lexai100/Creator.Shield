"""
RAG Service
ChromaDB-backed retrieval-augmented generation for legal knowledge and
exploitation patterns.  Pre-seeds the vector store with Indian legal
document templates on first boot.

Extended with creator-economy knowledge and business license knowledge bases.
"""

from __future__ import annotations

import datetime
import hashlib
import logging
import os
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from backend.data.templates.indian_legal_templates import TEMPLATES
from backend.data.templates.creator_economy.knowledge_chunks import CREATOR_ECONOMY_CHUNKS
from backend.data.templates.business_licenses.indian_business_kb import BUSINESS_LICENSES_KB

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

LEGAL_KNOWLEDGE_COLLECTION = "legal_knowledge"
EXPLOITATION_PATTERNS_COLLECTION = "exploitation_patterns"
CREATOR_ECONOMY_COLLECTION = "creator_economy_knowledge"
BUSINESS_LICENSES_COLLECTION = "business_licenses"

# Pre-built exploitation patterns for LoopholeHound context
EXPLOITATION_PATTERNS: list[dict[str, str]] = [
    {
        "id": "exp_missing_jurisdiction",
        "text": (
            "EXPLOITATION PATTERN: Missing or vague jurisdiction clause. "
            "If a contract does not specify the courts with exclusive jurisdiction, "
            "any party can file suit in any court in India, leading to forum-shopping. "
            "A tenant in Bangalore could force the landlord to litigate in Delhi. "
            "SEVERITY: HIGH. FIX: Add explicit exclusive jurisdiction clause naming "
            "specific city courts."
        ),
    },
    {
        "id": "exp_no_force_majeure",
        "text": (
            "EXPLOITATION PATTERN: Missing force majeure clause. "
            "Without a force majeure clause, parties remain liable for non-performance "
            "during pandemics, natural disasters, or government lockdowns. A tenant "
            "could be forced to pay rent during a government-mandated lockdown. "
            "SEVERITY: HIGH. FIX: Include detailed force majeure clause listing "
            "specific events and consequences (suspension, termination rights)."
        ),
    },
    {
        "id": "exp_undefined_terms",
        "text": (
            "EXPLOITATION PATTERN: Undefined or ambiguous key terms. "
            "Terms like 'reasonable', 'material', 'promptly', 'best efforts' without "
            "definition allow subjective interpretation. A freelancer's 'best efforts' "
            "could mean anything from 2 hours/day to 24/7 availability. "
            "SEVERITY: MEDIUM. FIX: Define all subjective terms with measurable criteria."
        ),
    },
    {
        "id": "exp_one_sided_termination",
        "text": (
            "EXPLOITATION PATTERN: One-sided termination rights. "
            "If only one party can terminate at will while the other is locked in, "
            "the contract is unconscionable. A client could terminate a freelancer "
            "mid-project with no payment for work done. "
            "SEVERITY: CRITICAL. FIX: Ensure bilateral termination rights with "
            "clear payment obligations for work completed before termination."
        ),
    },
    {
        "id": "exp_no_dispute_escalation",
        "text": (
            "EXPLOITATION PATTERN: No dispute resolution escalation path. "
            "Jumping straight to litigation is expensive and slow (Indian courts "
            "average 3-5 years). Without negotiation → mediation → arbitration steps, "
            "minor disputes become costly lawsuits. "
            "SEVERITY: MEDIUM. FIX: Include tiered dispute resolution: "
            "30-day negotiation → mediation → binding arbitration → courts."
        ),
    },
    {
        "id": "exp_no_liability_cap",
        "text": (
            "EXPLOITATION PATTERN: No limitation of liability. "
            "Without a liability cap, a minor breach could lead to disproportionate "
            "damages claims. A freelancer could face unlimited liability for a ₹50,000 "
            "project. SEVERITY: HIGH. FIX: Cap total liability to the contract value "
            "and exclude indirect/consequential damages."
        ),
    },
    {
        "id": "exp_ip_ambiguity",
        "text": (
            "EXPLOITATION PATTERN: Ambiguous intellectual property assignment. "
            "If IP ownership is not clearly assigned, disputes arise over who owns "
            "the work product. Under Indian Copyright Act, the creator retains "
            "copyright unless explicitly assigned in writing. A freelancer could "
            "retain ownership of code written for a client. "
            "SEVERITY: CRITICAL. FIX: Include explicit IP assignment clause with "
            "present-tense assignment language and moral rights waiver."
        ),
    },
    {
        "id": "exp_security_deposit_abuse",
        "text": (
            "EXPLOITATION PATTERN: Vague security deposit refund terms. "
            "Without clear conditions and timeline for deposit refund, landlords "
            "can withhold deposits indefinitely citing 'damages'. No itemization "
            "requirement means arbitrary deductions. "
            "SEVERITY: HIGH. FIX: Specify refund timeline (30 days max), require "
            "itemized deduction list, allow tenant to be present at damage inspection."
        ),
    },
]


# ── Service ───────────────────────────────────────────────────────────────────


class RAGService:
    """
    Retrieval-Augmented Generation service backed by ChromaDB.

    Four collections:
    • legal_knowledge         – positive examples / templates for DocumentCraft
    • exploitation_patterns   – attack patterns for LoopholeHound
    • creator_economy_knowledge – ASCI/CCPA/DPDP/Copyright regulations for creator contracts
    • business_licenses       – Indian business registration KB for Business Setup Agent
    """

    def __init__(self, persist_dir: str = "./chroma_db") -> None:
        os.makedirs(persist_dir, exist_ok=True)

        self._client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        # Get or create collections (use default embedding function)
        self._legal_col = self._client.get_or_create_collection(
            name=LEGAL_KNOWLEDGE_COLLECTION,
            metadata={"description": "Indian legal document templates and knowledge"},
        )
        self._exploit_col = self._client.get_or_create_collection(
            name=EXPLOITATION_PATTERNS_COLLECTION,
            metadata={"description": "Contract exploitation patterns for adversarial analysis"},
        )
        self._creator_col = self._client.get_or_create_collection(
            name=CREATOR_ECONOMY_COLLECTION,
            metadata={"description": "Creator economy regulations: ASCI, CCPA, DPDP, Copyright Act"},
        )
        self._business_col = self._client.get_or_create_collection(
            name=BUSINESS_LICENSES_COLLECTION,
            metadata={"description": "Indian business registration and licensing knowledge base"},
        )

        # Seed data on first run
        self._seed_if_empty()

    # ── Seeding ───────────────────────────────────────────────────────────

    def _seed_if_empty(self) -> None:
        """Populate collections with template data if they're empty."""
        if self._legal_col.count() == 0:
            logger.info("Seeding legal_knowledge collection with %d templates", len(TEMPLATES))
            ids: list[str] = []
            docs: list[str] = []
            metas: list[dict] = []
            for key, tmpl in TEMPLATES.items():
                ids.append(f"tmpl_{key}")
                docs.append(tmpl["template"])
                metas.append({
                    "type": key,
                    "title": tmpl["title"],
                    "source": "builtin_template",
                })
            self._legal_col.add(ids=ids, documents=docs, metadatas=metas)

        if self._exploit_col.count() == 0:
            logger.info(
                "Seeding exploitation_patterns collection with %d patterns",
                len(EXPLOITATION_PATTERNS),
            )
            self._exploit_col.add(
                ids=[p["id"] for p in EXPLOITATION_PATTERNS],
                documents=[p["text"] for p in EXPLOITATION_PATTERNS],
                metadatas=[{"source": "builtin_pattern"} for _ in EXPLOITATION_PATTERNS],
            )

        if self._creator_col.count() == 0:
            logger.info(
                "Seeding creator_economy_knowledge collection with %d chunks",
                len(CREATOR_ECONOMY_CHUNKS),
            )
            self._creator_col.add(
                ids=[c["id"] for c in CREATOR_ECONOMY_CHUNKS],
                documents=[c["text"] for c in CREATOR_ECONOMY_CHUNKS],
                metadatas=[
                    {
                        "source": c["source"],
                        "category": c["category"],
                        "last_synced": datetime.datetime.utcnow().isoformat(),
                    }
                    for c in CREATOR_ECONOMY_CHUNKS
                ],
            )

        if self._business_col.count() == 0:
            logger.info(
                "Seeding business_licenses collection with %d entries",
                len(BUSINESS_LICENSES_KB),
            )
            self._business_col.add(
                ids=[b["id"] for b in BUSINESS_LICENSES_KB],
                documents=[b["text"] for b in BUSINESS_LICENSES_KB],
                metadatas=[
                    {
                        "category": b["category"],
                        "source": "indian_business_kb",
                    }
                    for b in BUSINESS_LICENSES_KB
                ],
            )

    # ── Query helpers ─────────────────────────────────────────────────────

    def search_legal_knowledge(
        self,
        query: str,
        n_results: int = 3,
        doc_type: Optional[str] = None,
    ) -> list[str]:
        """Search the legal knowledge base. Returns list of relevant text chunks."""
        where_filter = {"type": doc_type} if doc_type else None
        results = self._legal_col.query(
            query_texts=[query],
            n_results=min(n_results, self._legal_col.count() or 1),
            where=where_filter if where_filter and self._legal_col.count() > 0 else None,
        )
        return results["documents"][0] if results["documents"] else []

    def search_exploitation_patterns(
        self,
        query: str,
        n_results: int = 5,
    ) -> list[str]:
        """Search exploitation patterns relevant to a document's content."""
        results = self._exploit_col.query(
            query_texts=[query],
            n_results=min(n_results, self._exploit_col.count() or 1),
        )
        return results["documents"][0] if results["documents"] else []

    def search_creator_patterns(
        self,
        query: str,
        n_results: int = 5,
        source_filter: Optional[str] = None,
    ) -> list[dict]:
        """
        Search creator-economy knowledge base.
        Returns list of dicts with text and metadata (source, category).
        Optionally filter by source (e.g. 'ASCI', 'CCPA', 'DPDP').
        """
        where_filter = {"source": source_filter} if source_filter else None
        results = self._creator_col.query(
            query_texts=[query],
            n_results=min(n_results, self._creator_col.count() or 1),
            where=where_filter if where_filter else None,
        )
        if not results["documents"]:
            return []
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
        return [{"text": d, "source": m.get("source", ""), "category": m.get("category", "")}
                for d, m in zip(docs, metas)]

    def search_business_knowledge(
        self,
        query: str,
        n_results: int = 5,
        category_filter: Optional[str] = None,
    ) -> list[dict]:
        """
        Search the business licenses knowledge base.
        Returns list of dicts with text and metadata (category).
        """
        where_filter = {"category": category_filter} if category_filter else None
        results = self._business_col.query(
            query_texts=[query],
            n_results=min(n_results, self._business_col.count() or 1),
            where=where_filter if where_filter else None,
        )
        if not results["documents"]:
            return []
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
        return [{"text": d, "category": m.get("category", "")} for d, m in zip(docs, metas)]

    # ── Ingestion ─────────────────────────────────────────────────────────

    def add_legal_document(
        self,
        text: str,
        doc_type: str = "general",
        metadata: Optional[dict] = None,
    ) -> str:
        """Add a new legal document chunk to the knowledge base."""
        doc_id = f"doc_{hashlib.sha256(text[:200].encode()).hexdigest()[:12]}"
        meta = {"type": doc_type, "source": "user_upload"}
        if metadata:
            meta.update(metadata)
        self._legal_col.add(ids=[doc_id], documents=[text], metadatas=[meta])
        return doc_id

    def add_exploitation_pattern(self, text: str, metadata: Optional[dict] = None) -> str:
        """Add a new exploitation pattern."""
        doc_id = f"exp_{hashlib.sha256(text[:200].encode()).hexdigest()[:12]}"
        meta = {"source": "learned"}
        if metadata:
            meta.update(metadata)
        self._exploit_col.add(ids=[doc_id], documents=[text], metadatas=[meta])
        return doc_id

    # ── Knowledge Refresh (stub) ──────────────────────────────────────────

    def refresh_knowledge_base(self, source_url: str, source_name: str) -> dict:
        """
        Stub: Re-fetch a knowledge source, diff against stored content, re-embed on change.
        Stores a last_synced timestamp per source.

        In production, this would:
        1. Fetch the URL content
        2. Compare hash against stored content
        3. Re-embed if changed
        4. Update the last_synced timestamp in the collection metadata

        Returns a dict with status and last_synced timestamp.
        """
        logger.info("refresh_knowledge_base called for source=%s url=%s", source_name, source_url)
        # TODO: Implement actual fetch + diff + re-embed logic when live sources are available
        return {
            "status": "stub",
            "source": source_name,
            "source_url": source_url,
            "last_synced": datetime.datetime.utcnow().isoformat(),
            "message": "Refresh stub called. Implement fetch + diff + re-embed for production.",
        }

    # ── Stats ─────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        """Return collection sizes for health checks."""
        return {
            "legal_knowledge_count": self._legal_col.count(),
            "exploitation_patterns_count": self._exploit_col.count(),
            "creator_economy_knowledge_count": self._creator_col.count(),
            "business_licenses_count": self._business_col.count(),
        }
