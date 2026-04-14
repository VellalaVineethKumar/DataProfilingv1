"""Dashboard landing page -- executive summary after data is loaded."""

from __future__ import annotations

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from typing import Any, Dict, List


def render_dashboard() -> None:
    """Render the executive dashboard tab."""

    state = st.session_state.app_state
    df: pd.DataFrame = state.df
    profiles: Dict[str, Any] = state.column_profiles
    quality_report: Any = state.quality_report

    if df is None:
        st.info("Load a dataset to see the dashboard.")
        return

    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols
    missing_cells = int(df.isnull().sum().sum())
    missing_pct = round((missing_cells / total_cells) * 100, 2) if total_cells else 0
    overall_score = getattr(quality_report, "overall_score", None)
    dup_rows = getattr(quality_report, "exact_duplicate_rows", 0) if quality_report else 0

    # -- KPI row -----------------------------------------------------------
    k1, k2, k3, k4, k5, k6 = st.columns(6)
    _kpi(k1, "Rows", f"{total_rows:,}")
    _kpi(k2, "Columns", str(total_cols))
    _kpi(k3, "Missing Cells", f"{missing_cells:,}")
    _kpi(k4, "Missing %", f"{missing_pct}%")
    _kpi(k5, "Duplicates", f"{dup_rows:,}")
    _kpi(k6, "Quality Score", f"{overall_score:.0f}" if isinstance(overall_score, (int, float)) else "--")

    st.divider()

    # -- Quality gauge + top issues ----------------------------------------
    g_col, issue_col = st.columns([1, 2])
    with g_col:
        _quality_gauge(overall_score)

    with issue_col:
        st.markdown("### Top Issues")
        issues = _collect_top_issues(profiles, quality_report, missing_pct, dup_rows, total_rows)
        if issues:
            for sev, msg in issues[:8]:
                colour = {"critical": "#dc2626", "warning": "#d97706", "info": "#3b82f6"}.get(sev, "#64748b")
                st.markdown(
                    f'<div style="border-left:4px solid {colour}; padding:6px 12px; margin:4px 0; '
                    f'background:#f8fafc; border-radius:0 6px 6px 0; font-size:0.85rem;">{msg}</div>',
                    unsafe_allow_html=True,
                )
        else:
            st.success("No issues detected -- your data looks clean.")

    st.divider()

    # -- Data type distribution + null heatmap -----------------------------
    dt_col, null_col = st.columns(2)
    with dt_col:
        st.markdown("### Data Type Distribution")
        dtype_counts = df.dtypes.astype(str).value_counts()
        fig_dt = go.Figure(go.Pie(
            labels=dtype_counts.index.tolist(),
            values=dtype_counts.values.tolist(),
            hole=0.45,
            marker_colors=["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"],
        ))
        fig_dt.update_layout(paper_bgcolor="#ffffff", font_color="#334155", height=320, margin=dict(t=20, b=20))
        st.plotly_chart(fig_dt, use_container_width=True)

    with null_col:
        st.markdown("### Top Missing-Value Columns")
        null_data = [
            {"Column": c, "Null %": round(p.null_percentage, 1)}
            for c, p in profiles.items()
            if p.null_percentage > 0
        ]
        if null_data:
            null_df = pd.DataFrame(null_data).sort_values("Null %", ascending=False).head(10)
            fig_null = go.Figure(go.Bar(
                x=null_df["Null %"].tolist(),
                y=null_df["Column"].tolist(),
                orientation="h",
                marker_color="#ef4444",
            ))
            fig_null.update_layout(
                plot_bgcolor="#ffffff", paper_bgcolor="#ffffff", font_color="#334155",
                height=320, margin=dict(l=10, r=10, t=10, b=10),
                yaxis=dict(autorange="reversed"),
            )
            st.plotly_chart(fig_null, use_container_width=True)
        else:
            st.success("No missing values in any column.")

    # -- Risk distribution -------------------------------------------------
    if profiles:
        st.markdown("### Column Risk Overview")
        risk_counts = {"Low": 0, "Medium": 0, "High": 0}
        for p in profiles.values():
            lvl = getattr(p, "risk_level", "Low")
            risk_counts[lvl] = risk_counts.get(lvl, 0) + 1

        rc1, rc2, rc3 = st.columns(3)
        rc1.metric("Low Risk", risk_counts["Low"])
        rc2.metric("Medium Risk", risk_counts["Medium"])
        rc3.metric("High Risk", risk_counts["High"])

    # -- Operations history ------------------------------------------------
    if state.fixes_applied:
        st.divider()
        st.markdown("### Recent Operations")
        for entry in reversed(state.fixes_applied[-10:]):
            st.caption(f"{entry.get('timestamp', '')} -- {entry.get('operation', '')} ({entry.get('rows', 0):,} rows)")


# -- helper functions -------------------------------------------------------

def _kpi(col: Any, label: str, value: str) -> None:
    """Render a single KPI card."""
    with col:
        st.markdown(
            f'<div style="background:#ffffff; border:1px solid #e2e8f0; padding:16px; '
            f'border-radius:10px; text-align:center;">'
            f'<div style="font-size:12px; color:#64748b; text-transform:uppercase;">{label}</div>'
            f'<div style="font-size:22px; font-weight:700; color:#1e40af;">{value}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


def _quality_gauge(score: Any) -> None:
    """Render a quality score gauge."""
    if not isinstance(score, (int, float)):
        st.info("Run profiling to see the quality gauge.")
        return
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=score,
        title={"text": "Quality Score"},
        gauge={
            "axis": {"range": [0, 100]},
            "bar": {"color": "#3b82f6"},
            "steps": [
                {"range": [0, 40], "color": "#fecaca"},
                {"range": [40, 70], "color": "#fef3c7"},
                {"range": [70, 100], "color": "#d1fae5"},
            ],
        },
    ))
    fig.update_layout(paper_bgcolor="#ffffff", font_color="#334155", height=280, margin=dict(t=40, b=10))
    st.plotly_chart(fig, use_container_width=True)


def _collect_top_issues(
    profiles: Dict[str, Any],
    quality_report: Any,
    missing_pct: float,
    dup_rows: int,
    total_rows: int,
) -> List[tuple]:
    """Return a list of (severity, message) tuples."""
    issues: List[tuple] = []

    if missing_pct > 20:
        issues.append(("critical", f"High missing data rate: {missing_pct}% of cells are empty"))
    elif missing_pct > 5:
        issues.append(("warning", f"Missing data: {missing_pct}% of cells are empty"))

    if dup_rows > 0:
        dup_pct = round(dup_rows / max(total_rows, 1) * 100, 1)
        if dup_pct > 10:
            issues.append(("critical", f"{dup_rows:,} duplicate rows ({dup_pct}%)"))
        else:
            issues.append(("warning", f"{dup_rows:,} duplicate rows ({dup_pct}%)"))

    for col_name, p in profiles.items():
        if getattr(p, "risk_level", "Low") == "High":
            issues.append(("critical", f"Column '{col_name}' has HIGH risk (score {getattr(p, 'risk_score', 0)})"))
        if p.null_percentage > 50:
            issues.append(("warning", f"Column '{col_name}' is more than 50% null"))
        for violation in getattr(p, "business_rule_violations", []):
            issues.append(("info", f"'{col_name}': {violation}"))

    issues.sort(key=lambda x: {"critical": 0, "warning": 1, "info": 2}.get(x[0], 3))
    return issues
