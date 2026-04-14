"""Persistent rule library backed by SQLite.

Stores named rule sets that can be saved, loaded, updated, and deleted.
Each rule set captures the full DQ configuration dictionary so it can be
applied to any compatible dataset.
"""

from __future__ import annotations

import json
import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_DB_DIR = Path(__file__).resolve().parent.parent / "data"
_DB_PATH = _DB_DIR / "rule_library.db"


def _get_connection() -> sqlite3.Connection:
    """Return a connection to the rule library database, creating it if needed."""
    _DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS rule_sets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            description TEXT    NOT NULL DEFAULT '',
            rules_json  TEXT    NOT NULL,
            created_at  TEXT    NOT NULL,
            updated_at  TEXT    NOT NULL
        )
        """
    )
    conn.commit()
    return conn


def save_rule_set(name: str, rules: Dict[str, Any], description: str = "") -> int:
    """Save or update a named rule set. Returns the row id."""
    conn = _get_connection()
    now = datetime.now().isoformat()
    rules_json = json.dumps(rules, default=str)
    try:
        cursor = conn.execute(
            """
            INSERT INTO rule_sets (name, description, rules_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                description = excluded.description,
                rules_json  = excluded.rules_json,
                updated_at  = excluded.updated_at
            """,
            (name, description, rules_json, now, now),
        )
        conn.commit()
        return cursor.lastrowid or 0
    finally:
        conn.close()


def load_rule_set(name: str) -> Optional[Dict[str, Any]]:
    """Load a named rule set. Returns None if not found."""
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT rules_json FROM rule_sets WHERE name = ?", (name,)
        ).fetchone()
        if row:
            return json.loads(row[0])
        return None
    finally:
        conn.close()


def list_rule_sets() -> List[Dict[str, Any]]:
    """Return metadata for all saved rule sets."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            "SELECT id, name, description, created_at, updated_at FROM rule_sets ORDER BY updated_at DESC"
        ).fetchall()
        return [
            {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "created_at": r[3],
                "updated_at": r[4],
            }
            for r in rows
        ]
    finally:
        conn.close()


def delete_rule_set(name: str) -> bool:
    """Delete a named rule set. Returns True if a row was deleted."""
    conn = _get_connection()
    try:
        cursor = conn.execute("DELETE FROM rule_sets WHERE name = ?", (name,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
