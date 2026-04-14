"""Custom CSS styles for Data Profiler Pro"""

# Enterprise CSS Styles
CUSTOM_CSS = """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    * { font-family: 'Inter', sans-serif; }

    /* ── Main Layout ────────────────────────────────────── */
    .main .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
        max-width: 96%;
    }

    /* ── Sidebar (light) ────────────────────────────────── */
    section[data-testid="stSidebar"] {
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
    }

    section[data-testid="stSidebar"] hr {
        border-color: #e2e8f0;
    }

    /* ── Header ─────────────────────────────────────────── */
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        margin-bottom: 0.5rem;
        letter-spacing: -0.03em;
    }

    .sub-header {
        text-align: center;
        color: #64748b;
        font-size: 1.1rem;
        margin-bottom: 2rem;
        font-weight: 400;
    }

    /* ── Cards ──────────────────────────────────────────── */
    .card {
        background: white;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
        border: 1px solid #e2e8f0;
        margin-bottom: 20px;
    }

    .card-header {
        font-size: 1.2rem;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 14px;
        border-bottom: 2px solid #f1f5f9;
    }

    /* ── Sidebar branded card (light) ───────────────────── */
    .sidebar-brand {
        background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
        border-radius: 12px;
        padding: 20px 16px;
        text-align: center;
        margin-bottom: 16px;
    }

    .sidebar-brand h2 {
        color: white !important;
        font-size: 1.15rem;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.01em;
    }

    .sidebar-brand p {
        color: rgba(255,255,255,0.75) !important;
        font-size: 0.75rem;
        margin: 4px 0 0;
    }

    .sidebar-user-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
    }

    .sidebar-user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
        color: white;
        flex-shrink: 0;
    }

    .sidebar-user-info {
        overflow: hidden;
    }

    .sidebar-user-info .name {
        color: #0f172a !important;
        font-weight: 600;
        font-size: 0.85rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .sidebar-user-info .role {
        color: #64748b !important;
        font-size: 0.7rem;
    }

    .sidebar-stat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 12px 0;
    }

    .sidebar-stat {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
    }

    .sidebar-stat .value {
        font-size: 1.2rem;
        font-weight: 700;
        color: #1e40af !important;
    }

    .sidebar-stat .label {
        font-size: 0.65rem;
        color: #64748b !important;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .sidebar-feature-list {
        list-style: none;
        padding: 0;
        margin: 8px 0;
    }

    .sidebar-feature-list li {
        color: #64748b !important;
        font-size: 0.78rem;
        padding: 5px 0;
    }

    /* ── Metrics ────────────────────────────────────────── */
    .metric-card {
        background: white;
        border-radius: 12px;
        padding: 18px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        border: 1px solid #e2e8f0;
        text-align: center;
    }

    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #1e40af;
    }

    .metric-label {
        font-size: 0.8rem;
        color: #64748b;
        font-weight: 500;
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    /* ── Score Display ──────────────────────────────────── */
    .score-container {
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        border-radius: 16px;
        padding: 32px;
        text-align: center;
        color: white;
        margin: 20px 0;
    }

    .score-value {
        font-size: 4rem;
        font-weight: 700;
        line-height: 1;
    }

    .score-label {
        font-size: 1.1rem;
        opacity: 0.9;
        margin-top: 8px;
    }

    /* ── Status Badges ──────────────────────────────────── */
    .status-excellent {
        background: #dcfce7;
        color: #166534;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.8rem;
    }
    .status-good {
        background: #dbeafe;
        color: #1e40af;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.8rem;
    }
    .status-warning {
        background: #fef3c7;
        color: #92400e;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.8rem;
    }
    .status-critical {
        background: #fee2e2;
        color: #991b1b;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 0.8rem;
    }

    /* ── Progress Bars ──────────────────────────────────── */
    .stProgress > div > div > div {
        background: linear-gradient(90deg, #3b82f6, #6366f1);
        border-radius: 4px;
    }

    /* ── Buttons ────────────────────────────────────────── */
    .stButton > button {
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.2s ease;
        letter-spacing: 0.01em;
    }

    .stButton > button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
    }

    .stButton > button:active {
        transform: translateY(0);
    }

    /* ── Tabs ───────────────────────────────────────────── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 2px;
        background: #f1f5f9;
        padding: 6px;
        border-radius: 10px;
        margin-bottom: 16px;
    }

    .stTabs [data-baseweb="tab"] {
        padding: 10px 18px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 0.85rem;
        color: #64748b;
        transition: all 0.15s ease;
    }

    .stTabs [data-baseweb="tab"]:hover {
        color: #1e40af;
        background: rgba(255, 255, 255, 0.6);
    }

    .stTabs [aria-selected="true"] {
        background: white !important;
        color: #1e40af !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        font-weight: 600;
    }

    /* ── Tables ─────────────────────────────────────────── */
    .stDataFrame {
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
    }

    /* ── Alerts ─────────────────────────────────────────── */
    .stAlert {
        border-radius: 10px;
    }

    /* ── Expander ───────────────────────────────────────── */
    .streamlit-expanderHeader {
        font-weight: 600;
        color: #0f172a;
        background: #f8fafc;
        border-radius: 10px;
        padding: 12px 16px;
    }

    .streamlit-expanderContent {
        border: 1px solid #e2e8f0;
        border-top: none;
        border-radius: 0 0 10px 10px;
        padding: 16px;
    }

    /* ── Workflow Steps ─────────────────────────────────── */
    .workflow-step {
        text-align: center;
        padding: 16px;
        border-radius: 10px;
        background: #f1f5f9;
    }

    .workflow-step.active {
        background: #dbeafe;
        border: 2px solid #3b82f6;
    }

    .workflow-step.completed {
        background: #dcfce7;
        border: 2px solid #10b981;
    }

    /* ── Similarity Bar ─────────────────────────────────── */
    .similarity-bar {
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        margin: 8px 0;
    }

    .similarity-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
    }

    /* ── Issue Cards ────────────────────────────────────── */
    .issue-card {
        border-left: 4px solid;
        padding: 12px 16px;
        margin: 8px 0;
        background: #f8fafc;
        border-radius: 0 10px 10px 0;
    }

    .issue-card.critical { border-left-color: #ef4444; }
    .issue-card.warning  { border-left-color: #f59e0b; }
    .issue-card.info     { border-left-color: #3b82f6; }

    /* ── Code blocks ────────────────────────────────────── */
    .stCodeBlock {
        border-radius: 10px;
    }

    /* ── Toast notifications ────────────────────────────── */
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }

    /* ── Loading spinner ────────────────────────────────── */
    .stSpinner > div {
        border-color: #3b82f6;
    }

    /* ── File uploader ──────────────────────────────────── */
    .stFileUploader {
        border: 2px dashed #cbd5e1;
        border-radius: 14px;
        padding: 24px;
        transition: all 0.2s ease;
    }

    .stFileUploader:hover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    /* ── Login page ─────────────────────────────────────── */
    .login-card {
        max-width: 420px;
        margin: 3rem auto;
        background: white;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        border: 1px solid #e2e8f0;
    }

    .login-header {
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%);
        padding: 32px 24px;
        text-align: center;
    }

    .login-header h2 {
        color: white !important;
        font-size: 1.4rem;
        font-weight: 700;
        margin: 0 0 4px;
    }

    .login-header p {
        color: rgba(255,255,255,0.75) !important;
        font-size: 0.85rem;
        margin: 0;
    }

    .login-body {
        padding: 28px 24px;
    }

    /* ── Popover (animation) ────────────────────────────── */
    .stPopover {
        animation: fadeIn 0.1s;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    /* ── Quality table columns ──────────────────────────── */
    div[data-testid="column"] {
        border-radius: 6px;
    }

    /* ── Selectbox / multiselect polish ─────────────────── */
    .stSelectbox [data-baseweb="select"] > div,
    .stMultiSelect [data-baseweb="select"] > div {
        border-radius: 8px;
    }

    /* ── Text input polish ──────────────────────────────── */
    .stTextInput > div > div {
        border-radius: 8px;
    }

    /* ── Divider ────────────────────────────────────────── */
    .stDivider {
        border-color: #f1f5f9;
    }
</style>
"""
