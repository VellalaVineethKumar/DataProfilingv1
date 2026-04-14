"""PDF profiling report generator.

Builds a self-contained HTML string and converts it to PDF bytes using
the ``kaleido`` back-end that is already in requirements.txt for Plotly
static image export.  If kaleido is unavailable the HTML is returned as a
downloadable file instead.
"""

from __future__ import annotations

import io
from datetime import datetime
from typing import Any, Dict, List, Optional

import pandas as pd


def generate_profiling_report_html(
    df: pd.DataFrame,
    column_profiles: Dict[str, Any],
    quality_report: Any,
    filename: str = "dataset",
) -> str:
    """Return a standalone HTML string summarising the profiling results."""

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols
    missing_cells = int(df.isnull().sum().sum())
    missing_pct = round((missing_cells / total_cells) * 100, 2) if total_cells else 0
    overall_score = getattr(quality_report, "overall_score", "N/A") if quality_report else "N/A"

    # -- per-column rows --------------------------------------------------
    col_rows_html = ""
    for col_name in df.columns:
        profile = column_profiles.get(col_name)
        if profile is None:
            col_rows_html += (
                f"<tr><td>{col_name}</td>"
                + "<td colspan='7' style='color:#94a3b8;'>No profile data</td></tr>"
            )
            continue

        risk_color = {"Low": "#16a34a", "Medium": "#d97706", "High": "#dc2626"}.get(
            getattr(profile, "risk_level", "Low"), "#64748b"
        )
        col_rows_html += (
            f"<tr>"
            f"<td><strong>{col_name}</strong></td>"
            f"<td>{getattr(profile, 'human_readable_dtype', profile.dtype)}</td>"
            f"<td>{profile.null_count} ({profile.null_percentage:.1f}%)</td>"
            f"<td>{profile.unique_count} ({profile.unique_percentage:.1f}%)</td>"
            f"<td>{profile.duplicate_count}</td>"
            f"<td>{profile.memory_usage}</td>"
            f"<td style='color:{risk_color};font-weight:600;'>{getattr(profile, 'risk_level', '-')}</td>"
            f"<td>{getattr(profile, 'risk_score', 0)}</td>"
            f"</tr>"
        )

    # -- issues summary ----------------------------------------------------
    issues_html = ""
    if quality_report and hasattr(quality_report, "columns_with_issues"):
        for col in quality_report.columns_with_issues[:20]:
            p = column_profiles.get(col)
            if p and getattr(p, "key_issues", None):
                for issue in p.key_issues:
                    issues_html += f"<li><strong>{col}:</strong> {issue}</li>"

    # -- recommendations ---------------------------------------------------
    recs_html = ""
    for col_name, profile in column_profiles.items():
        for rec in getattr(profile, "cleansing_recommendations", []):
            recs_html += (
                f"<tr><td>{col_name}</td>"
                f"<td>{rec.get('action', '')}</td>"
                f"<td>{rec.get('description', '')}</td>"
                f"<td>{rec.get('impact', '')}</td></tr>"
            )

    formatted_score = f"{overall_score:.0f}" if isinstance(overall_score, (int, float)) else str(overall_score)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Data Profiling Report - {filename}</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; }}
  h1 {{ color: #1e3a8a; border-bottom: 3px solid #3b82f6; padding-bottom: 8px; }}
  h2 {{ color: #1e40af; margin-top: 32px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 12px 0 24px; font-size: 0.85rem; }}
  th, td {{ border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }}
  th {{ background: #f1f5f9; color: #334155; font-weight: 600; }}
  tr:nth-child(even) {{ background: #f8fafc; }}
  .metric-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0 28px; }}
  .metric {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; text-align: center; }}
  .metric .val {{ font-size: 1.8rem; font-weight: 700; color: #1e40af; }}
  .metric .lbl {{ font-size: 0.75rem; color: #64748b; text-transform: uppercase; }}
  .score-box {{ background: linear-gradient(135deg,#1e3a8a,#3b82f6); color: #fff; border-radius: 14px;
                padding: 24px; text-align: center; margin: 16px 0; }}
  .score-box .val {{ font-size: 3rem; font-weight: 700; }}
  .score-box .lbl {{ opacity: 0.85; }}
  .footer {{ margin-top: 40px; font-size: 0.75rem; color: #94a3b8; text-align: center; }}
</style>
</head>
<body>
<h1>Data Profiling Report</h1>
<p><strong>File:</strong> {filename} &nbsp;|&nbsp; <strong>Generated:</strong> {now}</p>


<div class="score-box">
  <div class="val">{formatted_score}</div>
  <div class="lbl">Overall Quality Score</div>
</div>

<h2>Executive Summary</h2>
<div class="metric-grid">
  <div class="metric"><div class="val">{total_rows:,}</div><div class="lbl">Rows</div></div>
  <div class="metric"><div class="val">{total_cols}</div><div class="lbl">Columns</div></div>
  <div class="metric"><div class="val">{missing_cells:,}</div><div class="lbl">Missing Cells</div></div>
  <div class="metric"><div class="val">{missing_pct}%</div><div class="lbl">Missing %</div></div>
</div>

<h2>Column Profiles</h2>
<table>
<tr>
  <th>Column</th><th>Type</th><th>Nulls</th><th>Unique</th>
  <th>Duplicates</th><th>Memory</th><th>Risk</th><th>Score</th>
</tr>
{col_rows_html}
</table>

<h2>Key Issues</h2>
{"<ul>" + issues_html + "</ul>" if issues_html else "<p>No major issues detected.</p>"}

<h2>Cleansing Recommendations</h2>
{"<table><tr><th>Column</th><th>Action</th><th>Description</th><th>Impact</th></tr>"
 + recs_html + "</table>" if recs_html else "<p>No recommendations at this time.</p>"}

<div class="footer">
  Generated by Master Data Profiler &mdash; {now}
</div>
</body>
</html>"""
    return html


def html_to_pdf_bytes(html: str) -> Optional[bytes]:
    """Convert HTML to PDF bytes using a lightweight approach.

    Tries the built-in weasyprint or xhtml2pdf packages if available;
    otherwise returns None so the caller can fall back to HTML download.
    """
    try:
        import xhtml2pdf.pisa as pisa

        buffer = io.BytesIO()
        pisa.CreatePDF(io.StringIO(html), dest=buffer)
        return buffer.getvalue()
    except ImportError:
        pass

    return None
