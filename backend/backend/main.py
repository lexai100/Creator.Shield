"""
LexAI Backend – FastAPI Application
Main entry point with all REST and WebSocket endpoints.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

import httpx
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.agents.adversarial_loop import AdversarialLoop
from backend.agents.document_craft import DocumentCraftAgent
from backend.agents.loophole_hound import LoopholeHoundAgent
from backend.agents.business_setup_agent import BusinessSetupAgent
from backend.agents.scam_detector_agent import ScamDetectorAgent
from backend.config import settings
from backend.models.schemas import (
    AnalysisResult,
    BusinessSetupRequest,
    BusinessSetupResponse,
    CreatorContractAnalysis,
    CreatorVulnerability,
    DocumentGenerationRequest,
    DocumentType,
    NegotiationScriptRequest,
    NegotiationScriptResponse,
    STTResponse,
    TaskRecord,
    TaskStatus,
    TemplateInfo,
    UsageRightsAnalysis,
)
from backend.services.document_processor import DocumentProcessorService
from backend.services.indian_kanoon import IndianKanoonClient
from backend.services.pii_detector import PIIDetectorService
from backend.services.rag_service import RAGService
from backend.services.voice_service import VoiceService

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-25s │ %(levelname)-7s │ %(message)s",
)
logger = logging.getLogger("lexai")

# ── Global State (in-memory for hackathon) ────────────────────────────────────

tasks_store: dict[str, TaskRecord] = {}
ws_connections: dict[str, list[WebSocket]] = {}

# ── Service singletons (initialised at startup) ──────────────────────────────

rag_service: RAGService | None = None
pii_service: PIIDetectorService | None = None
document_craft: DocumentCraftAgent | None = None
loophole_hound: LoopholeHoundAgent | None = None
adversarial_loop: AdversarialLoop | None = None
voice_service: VoiceService | None = None
kanoon_client: IndianKanoonClient | None = None
business_setup_agent: BusinessSetupAgent | None = None
scam_detector: ScamDetectorAgent | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise services on startup, clean up on shutdown."""
    global rag_service, pii_service, document_craft, loophole_hound, adversarial_loop
    global voice_service, kanoon_client, business_setup_agent, scam_detector

    logger.info("══════════════════════════════════════════════════")
    logger.info("  LexAI Backend starting up…")
    logger.info("══════════════════════════════════════════════════")

    # RAG
    rag_service = RAGService(persist_dir=settings.CHROMA_PERSIST_DIR)
    stats = rag_service.get_stats()
    logger.info("ChromaDB ready: %s", stats)

    # PII
    fernet = settings.get_fernet()
    pii_service = PIIDetectorService(fernet=fernet)
    logger.info("PII detector ready (Indian recognisers loaded)")

    # Agents
    document_craft = DocumentCraftAgent(config=settings, rag_service=rag_service)
    loophole_hound = LoopholeHoundAgent(config=settings, rag_service=rag_service)
    adversarial_loop = AdversarialLoop(
        document_craft=document_craft,
        loophole_hound=loophole_hound,
        max_rounds=settings.MAX_ADVERSARIAL_ROUNDS,
        threshold=settings.EXPLOITABILITY_THRESHOLD,
    )
    # Business Setup Agent
    business_setup_agent = BusinessSetupAgent(config=settings, rag_service=rag_service)
    # Scam Detector
    scam_detector = ScamDetectorAgent(config=settings)
    logger.info(
        "Agents ready (Groq): DocumentCraft=%s, LoopholeHound=%s, BusinessSetup=FastModel, ScamDetector=ready",
        settings.DOCUMENT_CRAFT_MODEL,
        settings.LOOPHOLE_HOUND_MODEL,
    )

    # Voice service
    if settings.GROQ_API_KEY:
        try:
            voice_service = VoiceService(groq_api_key=settings.GROQ_API_KEY)
            logger.info("Voice service ready (Groq Whisper — multilingual)")
        except Exception as exc:
            logger.warning("Voice service init failed: %s", exc)
    else:
        logger.warning("GROQ_API_KEY not set — voice service disabled")

    # Indian Kanoon
    if settings.INDIAN_KANOON_TOKEN:
        try:
            kanoon_client = IndianKanoonClient(api_token=settings.INDIAN_KANOON_TOKEN)
            logger.info("Indian Kanoon client ready")
        except Exception as exc:
            logger.warning("Indian Kanoon init failed: %s", exc)
    else:
        logger.warning("INDIAN_KANOON_TOKEN not set — case law search disabled")

    logger.info("══════════════════════════════════════════════════")
    logger.info("  LexAI Backend ready on http://%s:%d", settings.HOST, settings.PORT)
    logger.info("══════════════════════════════════════════════════")

    yield  # ← application is running

    logger.info("LexAI Backend shutting down…")


# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="CreatorShield — AI Contract Protection for Creators",
    description=(
        "Protect your brand deals. Understand your rights. Build your business. "
        "Powered by an adversarial AI loop trained on Indian creator-economy law."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # open for hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helper: WebSocket broadcast ───────────────────────────────────────────────

async def _broadcast_to_task(task_id: str, data: dict[str, Any]) -> None:
    """Send a JSON message to all WebSocket clients watching a task."""
    sockets = ws_connections.get(task_id, [])
    dead: list[WebSocket] = []
    for ws in sockets:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        sockets.remove(ws)


# ── Helper: Run adversarial loop as background task ───────────────────────────

async def _run_adversarial_background(
    task_id: str,
    document_text: str,
    anonymize: bool = True,
) -> None:
    """Background coroutine: run the adversarial loop and update the task store."""
    assert adversarial_loop is not None
    assert pii_service is not None

    record = tasks_store[task_id]
    record.status = TaskStatus.RUNNING
    record.progress = 5

    try:
        # PII anonymisation
        pii_count = 0
        working_text = document_text
        token_map: dict[str, str] = {}
        if anonymize and pii_service:
            working_text, token_map = pii_service.tokenize(document_text)
            pii_count = len(token_map)
            logger.info("PII: tokenised %d entities", pii_count)

        # Progress callback
        async def on_round(round_data):
            record.current_round = round_data.round_number
            record.progress = min(
                90,
                10 + (round_data.round_number * 80 // settings.MAX_ADVERSARIAL_ROUNDS),
            )
            await _broadcast_to_task(task_id, {
                "type": "round_update",
                "task_id": task_id,
                "round": round_data.model_dump(),
                "progress": record.progress,
            })

        # Run the loop — 1 round only for contract checking.
        # The full 3-round loop is for generation. For checking:
        #   Round 1: attack original → find real issues → patch → output
        # No more rounds needed. More rounds = same issues flagged again = noise.
        result = await adversarial_loop.run_on_document(
            document_text=working_text,
            callback=on_round,
            max_rounds_override=1,
        )

        # De-tokenise the final document AND all findings text
        result_dict = result.model_dump(mode="json")
        if token_map and pii_service:
            result_dict = pii_service.detokenize_all(result_dict, token_map)
            # Also update the object's final_document for consistency
            result.final_document = result_dict.get("final_document", result.final_document)

        # Deduplicate vulnerabilities across rounds (Bug 2 fix):
        # Same issue can appear in round 1 and round 2 with different severity.
        # Keep only the highest-severity version of each unique (name, clause) pair.
        _SEV_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        seen: dict[tuple, dict] = {}
        for rnd in (result_dict.get("rounds") or []):
            for v in (rnd.get("vulnerabilities") or []):
                key = (
                    (v.get("name") or "").lower().strip()[:40],
                    (v.get("affected_clause") or "").lower().strip()[:40],
                )
                existing = seen.get(key)
                if not existing or (
                    _SEV_ORDER.get(v.get("severity", "LOW"), 0)
                    > _SEV_ORDER.get(existing.get("severity", "LOW"), 0)
                ):
                    seen[key] = v
        # Replace round vulnerabilities with deduplicated list
        if result_dict.get("rounds"):
            result_dict["rounds"][0]["vulnerabilities"] = list(seen.values())
            for rnd in result_dict["rounds"][1:]:
                rnd["vulnerabilities"] = []

        result.task_id = task_id
        result.pii_entities_found = pii_count
        result_dict["task_id"] = task_id
        result_dict["pii_entities_found"] = pii_count

        record.result = result
        record.status = TaskStatus.COMPLETED
        record.progress = 100

        await _broadcast_to_task(task_id, {
            "type": "completed",
            "task_id": task_id,
            "result": result_dict,
        })
        logger.info("Task %s completed. Final score: %d", task_id, result.risk_score)

    except Exception as exc:
        logger.exception("Task %s failed: %s", task_id, exc)
        record.status = TaskStatus.FAILED
        record.error = str(exc)
        await _broadcast_to_task(task_id, {
            "type": "error",
            "task_id": task_id,
            "error": str(exc),
        })


async def _run_generation_background(
    task_id: str,
    request: DocumentGenerationRequest,
) -> None:
    """Background coroutine: generate + optionally run adversarial loop."""
    assert adversarial_loop is not None

    record = tasks_store[task_id]
    record.status = TaskStatus.RUNNING
    record.progress = 5

    try:
        async def on_round(round_data):
            record.current_round = round_data.round_number
            record.progress = min(
                90,
                20 + (round_data.round_number * 70 // settings.MAX_ADVERSARIAL_ROUNDS),
            )
            await _broadcast_to_task(task_id, {
                "type": "round_update",
                "task_id": task_id,
                "round": round_data.model_dump(),
                "progress": record.progress,
            })

        result = await adversarial_loop.run_on_request(
            request=request,
            callback=on_round,
            max_rounds_override=request.max_rounds,
        )

        result.task_id = task_id
        record.result = result
        record.status = TaskStatus.COMPLETED
        record.progress = 100

        await _broadcast_to_task(task_id, {
            "type": "completed",
            "task_id": task_id,
            "result": result.model_dump(mode="json"),
        })
        logger.info("Task %s completed. Final score: %d", task_id, result.risk_score)

    except Exception as exc:
        logger.exception("Generation task %s failed: %s", task_id, exc)
        record.status = TaskStatus.FAILED
        record.error = str(exc)
        await _broadcast_to_task(task_id, {
            "type": "error",
            "task_id": task_id,
            "error": str(exc),
        })


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
async def root():
    return {"service": "LexAI", "status": "running", "version": "1.0.0"}


@app.get("/health", tags=["health"])
async def health_check():
    stats = rag_service.get_stats() if rag_service else {}
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models": {
            "document_craft": settings.DOCUMENT_CRAFT_MODEL,
            "loophole_hound": settings.LOOPHOLE_HOUND_MODEL,
            "fast": settings.FAST_MODEL,
        },
        "rag": stats,
        "active_tasks": len([t for t in tasks_store.values() if t.status == TaskStatus.RUNNING]),
    }


# ── Analyse (upload PDF or send text) ────────────────────────────────────────

@app.post("/api/analyze", tags=["analysis"])
async def analyze_document(
    background_tasks: BackgroundTasks,
    file: UploadFile | None = File(None),
    text: str = Form(""),
    context: str = Form(""),
    anonymize_pii: bool = Form(True),
):
    """
    Upload a PDF or paste text to analyse with the adversarial loop.
    Returns a task_id immediately — poll /api/status/{task_id} or
    connect to /api/ws/{task_id} for real-time updates.
    """
    document_text = ""

    if file and file.filename:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(400, "Uploaded file is empty")

        if file.filename.lower().endswith(".pdf"):
            extracted, pages = DocumentProcessorService.extract_text_from_pdf(pdf_bytes)
            document_text = extracted
        else:
            # Try to read as plain text
            try:
                document_text = pdf_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(400, "Unsupported file format. Upload a PDF or text file.")
    elif text:
        document_text = text
    else:
        raise HTTPException(400, "Provide either a file upload or text")

    if len(document_text.strip()) < 50:
        raise HTTPException(400, "Document is too short for meaningful analysis (minimum 50 characters)")

    # Create task
    task_id = uuid.uuid4().hex
    tasks_store[task_id] = TaskRecord(task_id=task_id)

    # Launch background
    background_tasks.add_task(
        _run_adversarial_background,
        task_id,
        document_text,
        anonymize_pii,
    )

    return {
        "task_id": task_id,
        "status": "pending",
        "message": "Analysis started. Use /api/status/{task_id} or connect via WebSocket.",
        "ws_url": f"/api/ws/{task_id}",
    }


# ── Generate ──────────────────────────────────────────────────────────────────

@app.post("/api/generate", tags=["generation"])
async def generate_document(
    request: DocumentGenerationRequest,
    background_tasks: BackgroundTasks,
):
    """
    Generate a new legal document from description.
    Optionally runs the adversarial loop on the generated document.
    """
    task_id = uuid.uuid4().hex
    tasks_store[task_id] = TaskRecord(task_id=task_id)

    background_tasks.add_task(_run_generation_background, task_id, request)

    return {
        "task_id": task_id,
        "status": "pending",
        "message": "Document generation started.",
        "ws_url": f"/api/ws/{task_id}",
    }


# ── Status polling ────────────────────────────────────────────────────────────

@app.get("/api/status/{task_id}", tags=["tasks"])
async def get_task_status(task_id: str):
    """Poll the status of a running analysis/generation task."""
    record = tasks_store.get(task_id)
    if not record:
        raise HTTPException(404, f"Task {task_id} not found")

    response: dict[str, Any] = {
        "task_id": task_id,
        "status": record.status,
        "progress": record.progress,
        "current_round": record.current_round,
        "created_at": record.created_at.isoformat(),
    }

    if record.status == TaskStatus.COMPLETED and record.result:
        response["result"] = record.result.model_dump(mode="json")
    elif record.status == TaskStatus.FAILED:
        response["error"] = record.error

    return response


# ── Download final document ───────────────────────────────────────────────────

@app.get("/api/download/{task_id}", tags=["tasks"])
async def download_document(task_id: str):
    """Download the final hardened document as plain text."""
    record = tasks_store.get(task_id)
    if not record:
        raise HTTPException(404, f"Task {task_id} not found")
    if record.status != TaskStatus.COMPLETED or not record.result:
        raise HTTPException(400, "Task not completed yet")

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=record.result.final_document,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="lexai_document_{task_id[:8]}.txt"'},
    )


# ── Templates ─────────────────────────────────────────────────────────────────

@app.get("/api/templates", tags=["templates"], response_model=list[TemplateInfo])
async def list_templates():
    """List available document types with descriptions."""
    return [
        TemplateInfo(
            document_type=DocumentType.RENT_AGREEMENT,
            title="Residential Rental Agreement (11-month)",
            description="Standard 11-month rental/lease agreement following Karnataka format, adaptable to other states.",
            sample_fields=["LANDLORD_NAME", "TENANT_NAME", "PROPERTY_ADDRESS", "MONTHLY_RENT", "SECURITY_DEPOSIT"],
        ),
        TemplateInfo(
            document_type=DocumentType.NDA,
            title="Non-Disclosure Agreement",
            description="Bilateral or unilateral NDA suitable for Indian businesses with IP protection and liquidated damages.",
            sample_fields=["DISCLOSER_NAME", "RECIPIENT_NAME", "PURPOSE_DESCRIPTION", "TERM_YEARS"],
        ),
        TemplateInfo(
            document_type=DocumentType.EMPLOYMENT,
            title="Employment Contract",
            description="Comprehensive employment agreement with Indian labour law compliance.",
            sample_fields=["EMPLOYER_NAME", "EMPLOYEE_NAME", "DESIGNATION", "CTC", "JOINING_DATE"],
        ),
        TemplateInfo(
            document_type=DocumentType.FREELANCE,
            title="Freelance / Service Contract",
            description="Independent contractor agreement with IP assignment, TDS provisions, and milestone payments.",
            sample_fields=["CLIENT_NAME", "FREELANCER_NAME", "SERVICES_DESCRIPTION", "TOTAL_FEE"],
        ),
        TemplateInfo(
            document_type=DocumentType.PARTNERSHIP,
            title="Partnership Deed",
            description="Partnership agreement under the Indian Partnership Act, 1932.",
            sample_fields=["PARTNER_A", "PARTNER_B", "BUSINESS_NAME", "CAPITAL_CONTRIBUTION"],
        ),
        TemplateInfo(
            document_type=DocumentType.SALE,
            title="Sale Agreement",
            description="Agreement for sale of property / goods under Transfer of Property Act.",
            sample_fields=["SELLER_NAME", "BUYER_NAME", "PROPERTY_DESCRIPTION", "SALE_PRICE"],
        ),
        TemplateInfo(
            document_type=DocumentType.MOU,
            title="Memorandum of Understanding",
            description="MOU for preliminary business understanding before formal contracts.",
            sample_fields=["PARTY_A", "PARTY_B", "PURPOSE", "DURATION"],
        ),
    ]


# ── Voice STT ─────────────────────────────────────────────────────────────────

@app.post("/api/voice/stt", tags=["voice"], response_model=STTResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form("auto"),
):
    """
    Convert speech to text using Groq Whisper (multilingual).
    Supports: en, hi (Hindi), kn (Kannada), ta (Tamil), te (Telugu), mr (Marathi).
    Set language='auto' for automatic detection.
    PII (Aadhaar, PAN, phone) is automatically stripped from the transcript.
    """
    if not voice_service:
        raise HTTPException(503, "Voice service not available — GROQ_API_KEY not configured")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(400, "Audio file is empty")

    filename = file.filename or "audio.webm"

    try:
        result = await voice_service.transcribe(
            audio_bytes=audio_bytes,
            filename=filename,
            language=language,  # type: ignore[arg-type]
            sanitize_pii=True,
        )
        return STTResponse(
            text=result["text"],
            language=result["language"],
            duration_seconds=result["duration_seconds"],
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except RuntimeError as exc:
        logger.error("STT error: %s", exc)
        raise HTTPException(502, str(exc))
    except Exception as exc:
        logger.exception("Unexpected STT error: %s", exc)
        raise HTTPException(500, f"Speech-to-text error: {exc}")


@app.post("/api/voice/tts", tags=["voice"])
async def text_to_speech(body: dict):
    """
    Prepare text for browser TTS playback.
    Returns the text plus voice hint metadata so the frontend can select
    the best available Indian voice via window.speechSynthesis.

    (Sarvam Bulbul upgrade: swap this endpoint body for an audio stream once
    the Sarvam API key is available.)
    """
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(400, "text is required")

    language = body.get("language", "en")

    # Map detected language → BCP-47 tag for SpeechSynthesis voice selection
    lang_map = {
        "hi": "hi-IN",
        "kn": "kn-IN",
        "ta": "ta-IN",
        "te": "te-IN",
        "mr": "mr-IN",
        "en": "en-IN",
    }
    bcp47 = lang_map.get(language, "en-IN")

    # Truncate for safety (browsers have TTS length limits)
    if len(text) > 2000:
        text = text[:1997] + "…"

    return {
        "text": text,
        "language_bcp47": bcp47,
        "provider": "browser",  # will be 'sarvam' after upgrade
        "char_count": len(text),
    }


# ── Quick analysis (no adversarial loop) ──────────────────────────────────────

@app.post("/api/quick-analyze", tags=["analysis"])
async def quick_analyze(
    file: UploadFile | None = File(None),
    text: str = Form(""),
):
    """
    Quick document analysis WITHOUT the adversarial loop.
    Returns analysis immediately (no background task).
    """
    assert document_craft is not None

    document_text = ""
    if file and file.filename:
        pdf_bytes = await file.read()
        if file.filename.lower().endswith(".pdf"):
            document_text, _ = DocumentProcessorService.extract_text_from_pdf(pdf_bytes)
        else:
            document_text = pdf_bytes.decode("utf-8", errors="replace")
    elif text:
        document_text = text
    else:
        raise HTTPException(400, "Provide either a file or text")

    analysis = await document_craft.analyze_document(document_text)
    return {"analysis": analysis}


# ── RAG management ────────────────────────────────────────────────────────────

@app.get("/api/rag/stats", tags=["rag"])
async def rag_stats():
    """Get RAG collection statistics."""
    if not rag_service:
        raise HTTPException(500, "RAG service not initialized")
    return rag_service.get_stats()


# ── Indian Kanoon — Case Law Search ───────────────────────────────────────────

@app.get("/api/kanoon/search", tags=["case-law"])
async def kanoon_search(
    q: str,
    court: str = "",
    page: int = 0,
):
    """
    Search Indian Kanoon for relevant court judgments.

    Query params:
      - q: search query (e.g. "rent dispute landlord")
      - court: court code filter — 'delhi', 'karnataka', 'supremecourt', '' (all)
      - page: result page (0-indexed)

    Returns top-5 results with title, headline, court, date, and public URL.
    Powered by Indian Kanoon API (attribution required).
    """
    if not kanoon_client:
        raise HTTPException(
            503,
            "Indian Kanoon search not available — INDIAN_KANOON_TOKEN not configured",
        )
    if not q or len(q.strip()) < 3:
        raise HTTPException(400, "Query must be at least 3 characters")

    try:
        results = await kanoon_client.search(
            query=q.strip(),
            court=court,  # type: ignore[arg-type]
            page=page,
            max_results=5,
        )
        return {
            "query": q,
            "court": court or "all",
            "page": page,
            "results": results,
            "attribution": "Powered by Indian Kanoon (indiankanoon.org)",
        }
    except RuntimeError as exc:
        logger.error("Kanoon search error: %s", exc)
        raise HTTPException(502, str(exc))
    except Exception as exc:
        logger.exception("Unexpected Kanoon error: %s", exc)
        raise HTTPException(500, f"Case law search error: {exc}")


@app.get("/api/kanoon/doc/{doc_id}", tags=["case-law"])
async def kanoon_get_doc(doc_id: int):
    """Fetch full text of an Indian Kanoon judgment by document ID."""
    if not kanoon_client:
        raise HTTPException(503, "Indian Kanoon not configured")
    try:
        return await kanoon_client.get_document(doc_id)
    except RuntimeError as exc:
        raise HTTPException(502, str(exc))


@app.get("/api/kanoon/search-for-type", tags=["case-law"])
async def kanoon_search_for_type(
    document_type: str,
    court: str = "",
    context: str = "",
):
    """
    Smart case-law search: given a document type (e.g. 'rent_agreement'),
    returns the most relevant Indian court cases for that contract category.
    """
    if not kanoon_client:
        raise HTTPException(503, "Indian Kanoon not configured")
    try:
        results = await kanoon_client.search_for_document_type(
            document_type=document_type,
            context=context or None,
            court=court,  # type: ignore[arg-type]
        )
        return {
            "document_type": document_type,
            "results": results,
            "attribution": "Powered by Indian Kanoon (indiankanoon.org)",
        }
    except RuntimeError as exc:
        raise HTTPException(502, str(exc))


# ── Creator-Economy Routes ────────────────────────────────────────────────────

@app.post("/api/analyze/creator-contract", tags=["creator"])
async def analyze_creator_contract(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    context: str = Form(""),
    creator_name: str = Form(""),
    brand_name: str = Form(""),
    tone: str = Form("collaborative"),
    anonymize_pii: bool = Form(True),
):
    """
    POST /api/analyze/creator-contract
    Runs the creator-specific adversarial loop on an influencer/brand contract.
    Returns CreatorContractAnalysis with red flags, plain-English explanations,
    usage rights analysis, and a negotiation email.
    """
    assert document_craft is not None
    assert loophole_hound is not None
    assert pii_service is not None
    assert adversarial_loop is not None

    # Extract document text
    doc_text = ""
    if file:
        from backend.services.document_processor import DocumentProcessorService
        processor = DocumentProcessorService()
        contents = await file.read()
        doc_text = processor.extract_text(contents, file.filename or "upload.pdf")
    elif text:
        doc_text = text
    else:
        raise HTTPException(400, "Either file or text is required")

    if len(doc_text.strip()) < 50:
        raise HTTPException(422, "Document text too short — could not extract meaningful content")

    # PII tokenisation
    token_map: dict = {}
    working_text = doc_text
    pii_count = 0
    if anonymize_pii:
        working_text, token_map = pii_service.tokenize(doc_text)
        pii_count = len(token_map)

    try:
        # 1. Creator-specific adversarial loop
        async def on_round(round_data):
            pass  # Could broadcast via WebSocket if needed

        # 1 round only — attack original, patch once, output.
        # Multi-round loops are for generation, not checking.
        loop_result = await adversarial_loop.run_on_document(
            document_text=working_text,
            callback=on_round,
            max_rounds_override=1,
        )

        # Also run creator-specific attack for richer metadata
        creator_attack_report = await loophole_hound.attack_creator_contract(working_text)
        creator_vulns = [
            v for v in creator_attack_report.vulnerabilities
            if isinstance(v, CreatorVulnerability)
        ]
        # If not already CreatorVulnerability, upgrade them
        if not creator_vulns:
            creator_vulns = [
                CreatorVulnerability(
                    **v.model_dump(),
                    category="other",
                    plain_english_explanation="",
                    cited_source="",
                    clause_text="",
                )
                for v in creator_attack_report.vulnerabilities
            ]

        # 2. Plain English translations
        plain_english = await document_craft.translate_to_plain_english(creator_vulns)

        # 3. Usage rights analysis
        usage_rights_raw = await document_craft.analyze_usage_rights(working_text)
        usage_rights = UsageRightsAnalysis(**{
            k: usage_rights_raw.get(k, v)
            for k, v in UsageRightsAnalysis().model_dump().items()
        })

        # 4. Negotiation script (auto-generated, user can also request via separate endpoint)
        negot_raw = await document_craft.generate_negotiation_script(
            flagged_issues=creator_vulns[:5],
            tone=tone,
            creator_name=creator_name,
            brand_name=brand_name,
        )
        negotiation_script = negot_raw.get("email_body", "")

        # De-tokenise ENTIRE result (not just final_document) to prevent
        # <<TOKEN>> appearing in vulnerability explanations or summaries
        result = CreatorContractAnalysis(
            **loop_result.model_dump(),
            creator_vulnerabilities=creator_vulns,
            usage_rights=usage_rights,
            negotiation_script=negotiation_script,
            plain_english_summary=plain_english,
            document_type_detected="creator_contract",
        )
        result_dict = result.model_dump(mode="json")
        if token_map:
            result_dict = pii_service.detokenize_all(result_dict, token_map)

        # Deduplicate findings by (name, clause) — keep highest severity
        _SEV_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        seen: dict[tuple, dict] = {}
        for v in (result_dict.get("creator_vulnerabilities") or []):
            key = (
                (v.get("name") or "").lower().strip()[:40],
                (v.get("affected_clause") or "").lower().strip()[:40],
            )
            existing = seen.get(key)
            if not existing or (
                _SEV_ORDER.get(v.get("severity", "LOW"), 0)
                > _SEV_ORDER.get(existing.get("severity", "LOW"), 0)
            ):
                seen[key] = v
        result_dict["creator_vulnerabilities"] = list(seen.values())

        result_dict["pii_entities_found"] = pii_count
        return result_dict

    except Exception as exc:
        logger.exception("Creator contract analysis failed: %s", exc)
        raise HTTPException(500, f"Analysis failed: {exc}")


@app.post("/api/negotiation-script", tags=["creator"])
async def generate_negotiation_script(
    request: NegotiationScriptRequest,
):
    """
    POST /api/negotiation-script
    Generate a negotiation email for flagged creator contract issues.
    """
    assert document_craft is not None

    try:
        result = await document_craft.generate_negotiation_script(
            flagged_issues=request.flagged_issues,
            tone=request.tone,
            creator_name=request.creator_name,
            brand_name=request.brand_name,
        )
        return NegotiationScriptResponse(
            email_subject=result.get("email_subject", "Re: Brand Collaboration — Contract Amendments"),
            email_body=result.get("email_body", ""),
            tone_used=request.tone,
            issues_addressed=len(request.flagged_issues),
        )
    except Exception as exc:
        raise HTTPException(500, f"Negotiation script generation failed: {exc}")


@app.post("/api/business-setup", tags=["business"])
async def business_setup_chat(
    request: BusinessSetupRequest,
):
    """
    POST /api/business-setup
    One turn of the conversational Business Setup Agent.
    The client sends the full conversation history each turn (stateless API).
    Returns a reply + optional final checklist.
    """
    assert business_setup_agent is not None
    assert pii_service is not None

    # Run message through PII tokenizer (don't send real Aadhaar/PAN to LLM)
    safe_message, _ = pii_service.tokenize(request.message)

    try:
        response = await business_setup_agent.chat(
            user_message=safe_message,
            conversation_history=request.conversation_history,
            session_id=request.session_id,
        )
        return response
    except Exception as exc:
        logger.exception("Business setup chat failed: %s", exc)
        raise HTTPException(500, f"Business setup chat failed: {exc}")


# ── Scam Deal Detector ────────────────────────────────────────────────────────

@app.post("/api/scam-check", tags=["scam"])
async def scam_check(body: dict):
    """
    POST /api/scam-check
    Detect if a brand deal email is a scam targeting an Indian creator.

    Body: { "email_text": str, "sender_email": str (optional) }

    Returns scam_score (0-100), verdict, red_flags, safe_signals, recommendation.
    Also used as the target endpoint for the n8n Gmail automation workflow.
    """
    assert scam_detector is not None

    email_text = (body.get("email_text") or "").strip()
    sender_email = (body.get("sender_email") or "").strip()

    if not email_text or len(email_text) < 20:
        raise HTTPException(400, "email_text is required (minimum 20 characters)")

    try:
        result = await scam_detector.analyze(email_text, sender_email)
        return result
    except Exception as exc:
        logger.exception("Scam check failed: %s", exc)
        raise HTTPException(500, f"Scam check failed: {exc}")


# ── General Chat ───────────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class GeneralChatMessage(_BaseModel):
    role: str
    content: str

class GeneralChatRequest(_BaseModel):
    messages: list[GeneralChatMessage]

class GeneralChatResponse(_BaseModel):
    reply: str

GENERAL_CHAT_SYSTEM = """You are **CreatorShield AI** — a knowledgeable legal assistant specialising in Indian creator economy law.

You help Indian content creators (YouTubers, Instagrammers, podcasters, artists) understand their rights, review contracts, and protect their business.

## Your expertise:
- Indian Contract Act, 1872
- Copyright Act, 1957 (creator IP rights)
- Information Technology Act, 2000
- Consumer Protection Act, 2019
- GST implications for creators
- Brand deal and sponsorship agreements
- Creator platform terms (YouTube, Instagram, etc.)

## Style:
- Be warm, clear, and direct — creators are not lawyers
- Use simple language, avoid legal jargon unless you explain it
- Format with bullet points or numbered steps when listing things
- Always mention when something needs a real lawyer's advice
- Keep replies concise but complete"""

@app.post("/api/chat", tags=["chat"])
async def general_chat(request: GeneralChatRequest) -> GeneralChatResponse:
    """
    POST /api/chat
    General legal assistant chat for Indian content creators.
    Stateless — client sends full message history each turn.
    """
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    from backend.services.llm_client import invoke_with_fallback

    lc_messages = [SystemMessage(content=GENERAL_CHAT_SYSTEM)]
    for m in request.messages[-12:]:  # last 12 messages for context
        if m.role == "user":
            lc_messages.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            lc_messages.append(AIMessage(content=m.content))

    try:
        response = await invoke_with_fallback(lc_messages, settings, temperature=0.4, max_tokens=1024)
        return GeneralChatResponse(reply=response.content)
    except Exception as exc:
        logger.exception("General chat failed: %s", exc)
        raise HTTPException(500, f"Chat failed: {exc}")


# ── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/api/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    """
    WebSocket for real-time adversarial loop updates.
    Clients receive round_update and completed/error messages.
    """
    await websocket.accept()

    # Register connection
    if task_id not in ws_connections:
        ws_connections[task_id] = []
    ws_connections[task_id].append(websocket)

    logger.info("WebSocket connected for task %s", task_id)

    # Send current status immediately
    record = tasks_store.get(task_id)
    if record:
        await websocket.send_json({
            "type": "status",
            "task_id": task_id,
            "status": record.status,
            "progress": record.progress,
        })
        # If already completed, send the result
        if record.status == TaskStatus.COMPLETED and record.result:
            await websocket.send_json({
                "type": "completed",
                "task_id": task_id,
                "result": record.result.model_dump(mode="json"),
            })

    try:
        # Keep connection alive, listen for client messages
        while True:
            data = await websocket.receive_text()
            # Client can send ping or cancel
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for task %s", task_id)
    finally:
        if task_id in ws_connections:
            try:
                ws_connections[task_id].remove(websocket)
            except ValueError:
                pass


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level="info",
    )
