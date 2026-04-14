"""Layout and UI components"""

from pathlib import Path

import streamlit as st
from config import apply_page_config

_ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "Images"
_LOGO_PATH = _ASSETS_DIR / "uniqus_logo.png"


def render_header():
    """Render application header"""
    apply_page_config()

def render_sidebar():
    """Sidebar with navigation and stats"""

    state = st.session_state.app_state

    with st.sidebar:
        # Logo
        if _LOGO_PATH.exists():
            st.image(str(_LOGO_PATH), width=180)

        # Branded header
        st.markdown(
            '<div class="sidebar-brand">'
            '<h2>Master Data Profiler</h2>'
            '<p>Enterprise Data Quality Platform</p>'
            '</div>',
            unsafe_allow_html=True
        )

        # User Info
        if state.authenticated:
            initials = "".join(
                w[0].upper() for w in (state.user_name or "U").split()[:2]
            )
            st.markdown(
                f'<div class="sidebar-user-card">'
                f'<div class="sidebar-user-avatar">{initials}</div>'
                f'<div class="sidebar-user-info">'
                f'<div class="name">{state.user_name}</div>'
                f'<div class="role">Authenticated</div>'
                f'</div></div>',
                unsafe_allow_html=True
            )

            if st.button("Logout", key="logout_btn", type="secondary", use_container_width=True):
                from state.session import clear_persisted_data
                clear_persisted_data()
                state.authenticated = False
                state.user_name = None
                state.username = None
                st.rerun()

            st.markdown("---")

        if state.df is not None:
            rows = f"{len(state.df):,}"
            cols = str(len(state.df.columns))

            if state.quality_report:
                score = state.quality_report.overall_score
                score_html = (
                    f'<div class="sidebar-stat">'
                    f'<div class="value">{score:.0f}</div>'
                    f'<div class="label">Quality</div></div>'
                )
            else:
                score_html = (
                    '<div class="sidebar-stat">'
                    '<div class="value">--</div>'
                    '<div class="label">Quality</div></div>'
                )

            if state.fixes_applied:
                ops_html = (
                    f'<div class="sidebar-stat">'
                    f'<div class="value">{len(state.fixes_applied)}</div>'
                    f'<div class="label">Operations</div></div>'
                )
            else:
                ops_html = (
                    '<div class="sidebar-stat">'
                    '<div class="value">0</div>'
                    '<div class="label">Operations</div></div>'
                )

            st.markdown(
                f'<div class="sidebar-stat-grid">'
                f'<div class="sidebar-stat">'
                f'<div class="value">{rows}</div>'
                f'<div class="label">Rows</div></div>'
                f'<div class="sidebar-stat">'
                f'<div class="value">{cols}</div>'
                f'<div class="label">Columns</div></div>'
                f'{score_html}'
                f'{ops_html}'
                f'</div>',
                unsafe_allow_html=True
            )

            # Processing status
            status_labels = {
                'idle': 'Idle',
                'uploading': 'Uploading',
                'profiling': 'Profiling',
                'ready': 'Ready',
                'error': 'Error'
            }
            label = status_labels.get(state.processing_status, 'Idle')
            st.markdown(
                f'<p style="text-align:center; font-size:0.8rem; color:#475569;">'
                f'<strong>Status:</strong> {label}</p>',
                unsafe_allow_html=True
            )

            st.markdown("---")

            st.markdown("### Quick Actions")

            if st.button("Reset Application", use_container_width=True, type="secondary", key="sidebar_reset"):
                from state.session import reset_application
                reset_application()
                st.rerun()

        st.markdown("---")

        # Enterprise features
        st.markdown(
            '<ul class="sidebar-feature-list">'
            '<li>Up to 1 GB file support</li>'
            '<li>Advanced data profiling</li>'
            '<li>Regex &amp; business rules</li>'
            '<li>Real-time preview</li>'
            '<li>Export reports</li>'
            '</ul>',
            unsafe_allow_html=True
        )

        # Project management
        with st.expander("Projects"):
            try:
                from core.projects import create_project, list_projects, delete_project, save_snapshot, list_snapshots, load_snapshot, update_project_metadata
                projects = list_projects()

                proj_names = [p["name"] for p in projects]
                new_proj = st.text_input("New project name", key="proj_new_name")
                if st.button("Create Project", key="proj_create", use_container_width=True):
                    if new_proj:
                        create_project(new_proj, owner=getattr(state, "username", "system") or "system")
                        st.rerun()

                if proj_names:
                    active = st.selectbox("Active project", proj_names, key="proj_active")

                    pc1, pc2 = st.columns(2)
                    with pc1:
                        if st.button("Save Snapshot", key="proj_save_snap", use_container_width=True):
                            snap_data = {
                                "filename": state.filename,
                                "row_count": len(state.df) if state.df is not None else 0,
                                "col_count": len(state.df.columns) if state.df is not None else 0,
                                "dq_config": st.session_state.get("dq_config", {}),
                            }
                            save_snapshot(active, "manual", snap_data)
                            st.rerun()
                    with pc2:
                        if st.button("Delete", key="proj_delete", use_container_width=True):
                            delete_project(active)
                            st.rerun()

                    snaps = list_snapshots(active)
                    if snaps:
                        st.caption(f"{len(snaps)} snapshot(s)")
                        for s in snaps[:5]:
                            st.caption(f"  {s['label']} -- {s['created_at'][:16]}")
                else:
                    st.caption("No projects yet.")
            except Exception:
                st.caption("Projects unavailable.")

        # Audit log viewer
        with st.expander("Audit Log"):
            try:
                from core.audit_log import get_recent_logs
                logs = get_recent_logs(limit=20)
                if logs:
                    for entry in logs:
                        ts = entry["timestamp"][:19].replace("T", " ")
                        st.caption(f"{ts} | {entry['username']} | {entry['action']}")
                else:
                    st.caption("No audit entries yet.")
            except Exception:
                st.caption("Audit log unavailable.")

        # System info
        st.markdown("---")
        st.caption("Version 2.0.0 Enterprise")
        st.caption(f"Session {id(st.session_state) % 10000}")


def render_toasts():
    """Placeholder - toasts are handled by session module"""
    pass
