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
# Try models in order — if one quota is exhausted we fall to the next.
# gemini-1.5-flash has a separate free-tier quota from gemini-2.0-flash.
_GEMINI_FALLBACK_MODELS: list[str] = [
    "gemini-1.5-flash",       # primary fallback — generous free tier
    "gemini-2.0-flash-lite",  # lighter 2.0 variant with own quota
    "gemini-2.0-flash",       # last resort (may be exhausted)
]

_GEMINI_DEFAULT = "gemini-1.5-flash"


def _gemini_model_for(groq_model: str) -> str:
    """Return the first model in the fallback list (model rotation handled in invoke)."""
    return _GEMINI_DEFAULT


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

    last_err: Exception | None = None

    # Try each Gemini model in order — rotate when one quota is exhausted
    for gemini_model in _GEMINI_FALLBACK_MODELS:
        logger.info("Attempting Gemini fallback with model: %s", gemini_model)
        gemini_llm = ChatGoogleGenerativeAI(
            model=gemini_model,
            google_api_key=gemini_api_key,
            temperature=temperature,
        )
        try:
            return await gemini_llm.ainvoke(messages)
        except Exception as e:
            err = str(e)
            if _is_rate_limit(err) or "quota" in err.lower() or "exhausted" in err.lower():
                logger.warning(
                    "Gemini model %s quota/rate-limit hit — trying next model. Error: %s",
                    gemini_model, err[:200]
                )
                last_err = e
                await asyncio.sleep(2)  # brief pause before next model
                continue
            raise  # non-quota error — propagate immediately

    raise RuntimeError(
        f"All Gemini fallback models exhausted. Last error: {last_err}. "
        "Either wait for quota reset or add a paid API key."
    )
