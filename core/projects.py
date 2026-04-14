"""Project / workspace management backed by SQLite.

A "project" is a named container holding metadata about a dataset,
its associated rules, profiles, and audit entries.  Multiple users
can share projects through the same SQLite file.
"""

from __future__ import annotations

import json
import pickle
import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

_DB_DIR = Path(__file__).resolve().parent.parent / "data"
_DB_PATH = _DB_DIR / "projects.db"


def _get_connection() -> sqlite3.Connection:
    _DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS projects (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT    NOT NULL UNIQUE,
            description  TEXT    NOT NULL DEFAULT '',
            owner        TEXT    NOT NULL DEFAULT 'system',
            created_at   TEXT    NOT NULL,
            updated_at   TEXT    NOT NULL,
            metadata_json TEXT   NOT NULL DEFAULT '{}'
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS project_snapshots (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            label        TEXT    NOT NULL DEFAULT 'snapshot',
            snapshot_blob BLOB,
            created_at   TEXT    NOT NULL
        )
        """
    )
    conn.commit()
    return conn


# ---- CRUD ----------------------------------------------------------------

def create_project(name: str, description: str = "", owner: str = "system") -> int:
    """Create a new project. Returns the project id."""
    conn = _get_connection()
    try:
        now = datetime.now().isoformat()
        cur = conn.execute(
            "INSERT INTO projects (name, description, owner, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (name, description, owner, now, now),
        )
        conn.commit()
        return cur.lastrowid or 0
    finally:
        conn.close()


def list_projects() -> List[Dict[str, Any]]:
    """Return metadata for all projects."""
    conn = _get_connection()
    try:
        rows = conn.execute(
            "SELECT id, name, description, owner, created_at, updated_at FROM projects ORDER BY updated_at DESC"
        ).fetchall()
        return [
            {"id": r[0], "name": r[1], "description": r[2], "owner": r[3], "created_at": r[4], "updated_at": r[5]}
            for r in rows
        ]
    finally:
        conn.close()


def get_project(name: str) -> Optional[Dict[str, Any]]:
    conn = _get_connection()
    try:
        row = conn.execute(
            "SELECT id, name, description, owner, created_at, updated_at, metadata_json FROM projects WHERE name = ?",
            (name,),
        ).fetchone()
        if row:
            return {
                "id": row[0], "name": row[1], "description": row[2],
                "owner": row[3], "created_at": row[4], "updated_at": row[5],
                "metadata": json.loads(row[6]),
            }
        return None
    finally:
        conn.close()


def delete_project(name: str) -> bool:
    conn = _get_connection()
    try:
        cur = conn.execute("DELETE FROM projects WHERE name = ?", (name,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def update_project_metadata(name: str, metadata: Dict[str, Any]) -> None:
    """Store arbitrary metadata (rules, column config, etc.) on a project."""
    conn = _get_connection()
    try:
        now = datetime.now().isoformat()
        conn.execute(
            "UPDATE projects SET metadata_json = ?, updated_at = ? WHERE name = ?",
            (json.dumps(metadata, default=str), now, name),
        )
        conn.commit()
    finally:
        conn.close()


# ---- snapshots -----------------------------------------------------------

def save_snapshot(project_name: str, label: str, state_dict: Dict[str, Any]) -> int:
    """Pickle a state dict into a snapshot for the given project."""
    conn = _get_connection()
    try:
        proj = conn.execute("SELECT id FROM projects WHERE name = ?", (project_name,)).fetchone()
        if not proj:
            raise ValueError(f"Project '{project_name}' not found")
        blob = pickle.dumps(state_dict)
        now = datetime.now().isoformat()
        cur = conn.execute(
            "INSERT INTO project_snapshots (project_id, label, snapshot_blob, created_at) VALUES (?, ?, ?, ?)",
            (proj[0], label, blob, now),
        )
        conn.commit()
        return cur.lastrowid or 0
    finally:
        conn.close()


def list_snapshots(project_name: str) -> List[Dict[str, Any]]:
    conn = _get_connection()
    try:
        proj = conn.execute("SELECT id FROM projects WHERE name = ?", (project_name,)).fetchone()
        if not proj:
            return []
        rows = conn.execute(
            "SELECT id, label, created_at FROM project_snapshots WHERE project_id = ? ORDER BY id DESC",
            (proj[0],),
        ).fetchall()
        return [{"id": r[0], "label": r[1], "created_at": r[2]} for r in rows]
    finally:
        conn.close()


def load_snapshot(snapshot_id: int) -> Optional[Dict[str, Any]]:
    conn = _get_connection()
    try:
        row = conn.execute("SELECT snapshot_blob FROM project_snapshots WHERE id = ?", (snapshot_id,)).fetchone()
        if row and row[0]:
            return pickle.loads(row[0])
        return None
    finally:
        conn.close()
