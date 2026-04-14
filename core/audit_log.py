"""Durable audit trail backed by SQLite.

Records every significant user action (data load, transformation, export,
rule application, etc.) with timestamps, the acting user, and a description.
"""

from __future__ import annotations

import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_DB_DIR = Path(__file__).resolve().parent.parent / "data"
_DB_PATH = _DB_DIR / "audit_log.db"


def _get_connection() -> sqlite3.Connection:
    """Return a connection to the audit log database, creating it if needed."""
    _DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT    NOT NULL,
            username    TEXT    NOT NULL DEFAULT 'system',
            action      TEXT    NOT NULL,
            detail      TEXT    NOT NULL DEFAULT '',
            category    TEXT    NOT NULL DEFAULT 'general',
            row_count   INTEGER,
            col_count   INTEGER,
            filename    TEXT
        )
        """
    )
    conn.commit()
    return conn


def log_action(
    action: str,
    detail: str = "",
    *,
    username: str = "system",
    category: str = "general",
    row_count: Optional[int] = None,
    col_count: Optional[int] = None,
    filename: Optional[str] = None,
) -> int:
    """Write an audit log entry. Returns the entry id."""
    conn = _get_connection()
    try:
        now = datetime.now().isoformat()
        cursor = conn.execute(
            """
            INSERT INTO audit_log (timestamp, username, action, detail, category, row_count, col_count, filename)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (now, username, action, detail, category, row_count, col_count, filename),
        )
        conn.commit()
        return cursor.lastrowid or 0
    except Exception as exc:
        logger.debug("Failed to write audit log: %s", exc)
        return 0
    finally:
        conn.close()


def get_recent_logs(limit: int = 100, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch the most recent audit log entries."""
    conn = _get_connection()
    try:
        if category:
            rows = conn.execute(
                "SELECT id, timestamp, username, action, detail, category, row_count, col_count, filename "
                "FROM audit_log WHERE category = ? ORDER BY id DESC LIMIT ?",
                (category, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, timestamp, username, action, detail, category, row_count, col_count, filename "
                "FROM audit_log ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [
            {
                "id": r[0],
                "timestamp": r[1],
                "username": r[2],
                "action": r[3],
                "detail": r[4],
                "category": r[5],
                "row_count": r[6],
                "col_count": r[7],
                "filename": r[8],
            }
            for r in rows
        ]
    finally:
        conn.close()


def clear_logs() -> int:
    """Delete all audit log entries. Returns number of rows deleted."""
    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM audit_log")
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()
