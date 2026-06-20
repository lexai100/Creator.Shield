"""
Shared LLM client utility with automatic Groq → Gemini fallback.

Usage
-----
from backend.services.llm_client import invoke_with_fallback

response = await invoke_with_fallback(messages, config, temperature=0.7, max_tokens=4096)

The function always tries Groq first.  If Groq returns a 429 / rate-limit
error, it immediately switches to Google Gemini for that call and all
subsequent calls in that process until Groq is available again (tracked via
a module-level flag that resets after GROQ_COOLDOWN_SECONDS).
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# ── Groq cooldown state ───────────────────────────────────────────────────────
# When Groq is rate-limited we set _groq_blocked_until to future timestamp.
_groq_blocked_until: float = 0.0
GROQ_COOLDOWN_SECONDS: int = 60  # back-off window before retrying Groq


def _groq_is_blocked() -> bool:
    return time.monotonic() < _groq_blocked_until


def _block_groq(seconds: int = GROQ_COOLDOWN_SECONDS) -> None:
    global _groq_blocked_until
    _groq_blocked_until = time.monotonic() + seconds
    logger.warning("Groq rate-limited — using Gemini fallback for the next %ds", seconds)


def _is_rate_limit(err: str) -> bool:
    return "429" in err or "rate" in err.lower() or "too many" in err.lower()


# ── Gemini model mapping ──────────────────────────────────────────────────────
# Map Groq model names → equivalent Gemini model
_GROQ_TO_GEMINI: dict[str, str] = {
    "llama-3.3-70b-versatile": "gemini-2.0-flash",
    "llama-3.1-8b-instant":    "gemini-2.0-flash",
    "llama-3.1-70b-versatile": "gemini-2.0-flash",
    "llama-3-70b-8192":        "gemini-2.0-flash",
    "mixtral-8x7b-32768":      "gemini-2.0-flash",
}

_GEMINI_DEFAULT = "gemini-2.0-flash"


def _gemini_model_for(groq_model: str) -> str:
    return _GROQ_TO_GEMINI.get(groq_model, _GEMINI_DEFAULT)


# ── Core invoke helper ────────────────────────────────────────────────────────

async def invoke_with_fallback(
    messages: list,
    config: Any,          # backend.config.Settings
    *,
    temperature: float = 0.5,
    groq_model: str | None = None,
    **kwargs,             # absorb any legacy max_tokens= callers pass in
) -> Any:
    """
    Invoke the LLM with automatic Groq → Gemini fallback on rate limits.

    Parameters
    ----------
    messages    : LangChain message list (SystemMessage / HumanMessage etc.)
    config      : Settings instance (needs GROQ_API_KEY, GROQ_BASE_URL, GEMINI_API_KEY)
    temperature : sampling temperature
    groq_model  : override the Groq model name (defaults to config.FAST_MODEL)

    Note: max_tokens is intentionally NOT set — models use their full context window.
    """
    from langchain_openai import ChatOpenAI  # Groq uses OpenAI-compatible endpoint

    groq_model = groq_model or getattr(config, "FAST_MODEL", "llama-3.1-8b-instant")

    # ── Try Groq first (unless it's in cooldown) ──────────────────────────────
    if not _groq_is_blocked():
        groq_llm = ChatOpenAI(
            model=groq_model,
            base_url=config.GROQ_BASE_URL,
            api_key=config.GROQ_API_KEY,
            temperature=temperature,
        )
        try:
            return await groq_llm.ainvoke(messages)
        except Exception as e:
            err = str(e)
            if _is_rate_limit(err):
                logger.warning("Groq 429 received — falling back to Gemini. Error: %s", err)
                _block_groq()
                # fall through to Gemini below
            else:
                raise  # non-rate-limit error — propagate as-is

    # ── Gemini fallback ───────────────────────────────────────────────────────
    gemini_api_key = getattr(config, "GEMINI_API_KEY", "")
    if not gemini_api_key:
        raise RuntimeError(
            "Groq is rate-limited and GEMINI_API_KEY is not set. "
            "Add GEMINI_API_KEY to your .env file."
        )

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
    except ImportError as exc:
        raise RuntimeError(
            "langchain-google-genai is not installed. "
            "Run: pip install langchain-google-genai"
        ) from exc

    gemini_model = _gemini_model_for(groq_model)
    logger.info("Using Gemini fallback model: %s", gemini_model)

    gemini_llm = ChatGoogleGenerativeAI(
        model=gemini_model,
        google_api_key=gemini_api_key,
        temperature=temperature,
    )

    # Gemini retry with backoff (in case it also rate-limits)
    for attempt in range(3):
        try:
            return await gemini_llm.ainvoke(messages)
        except Exception as e:
            err = str(e)
            if _is_rate_limit(err) and attempt < 2:
                wait = (2 ** attempt) * 5
                logger.warning("Gemini rate-limited. Retrying in %ds (attempt %d/3)", wait, attempt + 1)
                await asyncio.sleep(wait)
            else:
                raise

    raise RuntimeError("Both Groq and Gemini failed after retries.")
