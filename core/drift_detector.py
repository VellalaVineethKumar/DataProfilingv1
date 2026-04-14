"""Data drift detection engine.

Compares the current dataset's per-column statistics against a saved
baseline profile and flags columns whose distributions have shifted
beyond configurable thresholds.
"""

from __future__ import annotations

import json
import sqlite3
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_DB_DIR = Path(__file__).resolve().parent.parent / "data"
_DB_PATH = _DB_DIR / "baselines.db"


def _get_connection() -> sqlite3.Connection:
    _DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS baselines (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL UNIQUE,
            profile_json TEXT   NOT NULL,
            created_at  TEXT    NOT NULL
        )
        """
    )
    conn.commit()
    return conn


# ---- baseline storage ----------------------------------------------------

def save_baseline(name: str, df: pd.DataFrame, column_profiles: Dict[str, Any]) -> None:
    """Persist a baseline snapshot (summary stats per column)."""
    snapshot: Dict[str, Any] = {}
    for col in df.columns:
        stats: Dict[str, Any] = {"dtype": str(df[col].dtype)}
        profile = column_profiles.get(col)
        if profile:
            stats["null_percentage"] = getattr(profile, "null_percentage", 0)
            stats["unique_percentage"] = getattr(profile, "unique_percentage", 0)
            stats["unique_count"] = getattr(profile, "unique_count", 0)
            stats["risk_score"] = getattr(profile, "risk_score", 0)
        if pd.api.types.is_numeric_dtype(df[col]):
            col_vals = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(col_vals) > 0:
                stats["mean"] = float(col_vals.mean())
                stats["std"] = float(col_vals.std())
                stats["min"] = float(col_vals.min())
                stats["max"] = float(col_vals.max())
                stats["median"] = float(col_vals.median())
        stats["row_count"] = len(df)
        snapshot[col] = stats

    conn = _get_connection()
    try:
        now = datetime.now().isoformat()
        conn.execute(
            """
            INSERT INTO baselines (name, profile_json, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET profile_json = excluded.profile_json, created_at = excluded.created_at
            """,
            (name, json.dumps(snapshot, default=str), now),
        )
        conn.commit()
    finally:
        conn.close()


def list_baselines() -> List[Dict[str, str]]:
    """Return metadata for all saved baselines."""
    conn = _get_connection()
    try:
        rows = conn.execute("SELECT name, created_at FROM baselines ORDER BY created_at DESC").fetchall()
        return [{"name": r[0], "created_at": r[1]} for r in rows]
    finally:
        conn.close()


def load_baseline(name: str) -> Optional[Dict[str, Any]]:
    """Load a baseline snapshot by name."""
    conn = _get_connection()
    try:
        row = conn.execute("SELECT profile_json FROM baselines WHERE name = ?", (name,)).fetchone()
        if row:
            return json.loads(row[0])
        return None
    finally:
        conn.close()


def delete_baseline(name: str) -> bool:
    conn = _get_connection()
    try:
        cur = conn.execute("DELETE FROM baselines WHERE name = ?", (name,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ---- drift computation ---------------------------------------------------

def detect_drift(
    df: pd.DataFrame,
    column_profiles: Dict[str, Any],
    baseline: Dict[str, Any],
    null_threshold: float = 5.0,
    unique_threshold: float = 10.0,
    mean_std_threshold: float = 2.0,
) -> List[Dict[str, Any]]:
    """Compare current data against a baseline and return a list of drift alerts.

    Parameters
    ----------
    null_threshold : float
        Absolute change in null % to flag.
    unique_threshold : float
        Absolute change in unique % to flag.
    mean_std_threshold : float
        Number of baseline standard deviations the current mean can shift before flagging.
    """
    alerts: List[Dict[str, Any]] = []

    for col in df.columns:
        base = baseline.get(col)
        if base is None:
            alerts.append({"column": col, "type": "new_column", "message": "Column not present in baseline"})
            continue

        profile = column_profiles.get(col)
        current_null_pct = getattr(profile, "null_percentage", 0) if profile else 0
        base_null_pct = base.get("null_percentage", 0)
        if abs(current_null_pct - base_null_pct) > null_threshold:
            alerts.append({
                "column": col,
                "type": "null_rate",
                "message": f"Null % shifted from {base_null_pct:.1f}% to {current_null_pct:.1f}%",
                "baseline": base_null_pct,
                "current": current_null_pct,
            })

        current_unique_pct = getattr(profile, "unique_percentage", 0) if profile else 0
        base_unique_pct = base.get("unique_percentage", 0)
        if abs(current_unique_pct - base_unique_pct) > unique_threshold:
            alerts.append({
                "column": col,
                "type": "cardinality",
                "message": f"Unique % shifted from {base_unique_pct:.1f}% to {current_unique_pct:.1f}%",
                "baseline": base_unique_pct,
                "current": current_unique_pct,
            })

        if pd.api.types.is_numeric_dtype(df[col]) and "mean" in base and "std" in base:
            col_vals = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(col_vals) > 0:
                current_mean = float(col_vals.mean())
                base_mean = base["mean"]
                base_std = base.get("std", 0)
                if base_std > 0 and abs(current_mean - base_mean) > mean_std_threshold * base_std:
                    alerts.append({
                        "column": col,
                        "type": "mean_shift",
                        "message": f"Mean shifted from {base_mean:.2f} to {current_mean:.2f} ({abs(current_mean - base_mean) / base_std:.1f} sigma)",
                        "baseline": base_mean,
                        "current": current_mean,
                    })

    for base_col in baseline:
        if base_col not in df.columns:
            alerts.append({"column": base_col, "type": "missing_column", "message": "Column present in baseline but missing from current data"})

    return alerts
