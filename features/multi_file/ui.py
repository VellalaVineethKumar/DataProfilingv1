"""Multi-file profiling -- upload multiple files and compare schemas/profiles."""

from __future__ import annotations

import io
import os
import tempfile
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from state.session import show_toast


def render_multi_file() -> None:
    """Render the multi-file comparison tab."""

    st.markdown("## Multi-File Profiling")
    st.caption(
        "Upload multiple CSV / Excel files (e.g. monthly extracts) to compare "
        "their schemas and summary statistics side by side."
    )

    uploaded_files = st.file_uploader(
        "Upload files",
        type=["csv", "tsv", "xlsx", "xls", "parquet", "json"],
        accept_multiple_files=True,
        key="mf_uploader",
    )

    if not uploaded_files or len(uploaded_files) < 2:
        st.info("Upload at least 2 files to compare.")
        return

    frames: Dict[str, pd.DataFrame] = {}
    for uf in uploaded_files:
        try:
            df = _read_upload(uf)
            frames[uf.name] = df
        except Exception as exc:
            st.error(f"Failed to read {uf.name}: {exc}")

    if len(frames) < 2:
        return

    # -- schema comparison -------------------------------------------------
    st.markdown("### Schema Comparison")
    all_cols_set: set = set()
    schema_rows: List[Dict[str, Any]] = []
    for fname, df in frames.items():
        all_cols_set.update(df.columns.tolist())

    for col in sorted(all_cols_set):
        row: Dict[str, Any] = {"Column": col}
        for fname, df in frames.items():
            if col in df.columns:
                row[fname] = str(df[col].dtype)
            else:
                row[fname] = "MISSING"
        schema_rows.append(row)

    schema_df = pd.DataFrame(schema_rows)
    st.dataframe(schema_df, use_container_width=True, hide_index=True)

    # -- row / column counts -----------------------------------------------
    st.markdown("### File Statistics")
    stats_rows = []
    for fname, df in frames.items():
        total_cells = len(df) * len(df.columns)
        missing = int(df.isnull().sum().sum())
        stats_rows.append({
            "File": fname,
            "Rows": len(df),
            "Columns": len(df.columns),
            "Missing Cells": missing,
            "Missing %": round((missing / total_cells) * 100, 2) if total_cells else 0,
        })
    st.dataframe(pd.DataFrame(stats_rows), use_container_width=True, hide_index=True)

    # -- common-column null comparison chart --------------------------------
    common_cols = sorted(all_cols_set.intersection(*[set(df.columns) for df in frames.values()]))
    if common_cols:
        st.markdown("### Null % by Column (Common Columns)")
        null_chart_data: List[Dict[str, Any]] = []
        for col in common_cols:
            for fname, df in frames.items():
                null_pct = round(df[col].isnull().sum() / max(len(df), 1) * 100, 2)
                null_chart_data.append({"Column": col, "File": fname, "Null %": null_pct})
        null_df = pd.DataFrame(null_chart_data)

        import plotly.express as px
        fig = px.bar(
            null_df,
            x="Column",
            y="Null %",
            color="File",
            barmode="group",
        )
        fig.update_layout(
            plot_bgcolor="#ffffff",
            paper_bgcolor="#ffffff",
            font_color="#334155",
            height=400,
            xaxis_tickangle=-45,
        )
        st.plotly_chart(fig, use_container_width=True)


def _read_upload(uploaded_file: Any) -> pd.DataFrame:
    """Read an uploaded file into a DataFrame."""
    name = uploaded_file.name.lower()
    if name.endswith((".csv", ".txt")):
        return pd.read_csv(uploaded_file, low_memory=False)
    if name.endswith(".tsv"):
        return pd.read_csv(uploaded_file, sep="\t", low_memory=False)
    if name.endswith((".xlsx", ".xls")):
        return pd.read_excel(uploaded_file)
    if name.endswith((".parquet", ".pq")):
        return pd.read_parquet(uploaded_file)
    if name.endswith(".json"):
        return pd.read_json(uploaded_file)
    raise ValueError(f"Unsupported file type: {name}")
