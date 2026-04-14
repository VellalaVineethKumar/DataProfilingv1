"""Load Data Component - Simple and intuitive file upload"""

import streamlit as st
import pandas as pd
import os
import time

from core.large_file_handler import ChunkedFileUploader, StreamingDataLoader
from state.session import init_session_state, recalculate_profiles, show_toast, check_profiling_complete


def render_load_data():
    """Simple file upload with automatic processing"""
    
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.markdown('<div class="card-header">Load Data (Up to 1 GB)</div>', unsafe_allow_html=True)
    
    state = st.session_state.app_state
    
    # File upload section
    col1, col2 = st.columns([3, 1])
    
    with col1:
        uploaded_file = st.file_uploader(
            "Choose a file",
            type=['csv', 'txt', 'tsv', 'xlsx', 'xls', 'json', 'jsonl', 
                  'parquet', 'pq', 'feather', 'ftr'],
            help="Supports files up to 1 GB",
            key="ld_file_uploader"
        )
    
    with col2:
        st.markdown("**Supported Formats**")
        st.caption("• CSV/TSV/TXT\n• Excel (XLSX/XLS)\n• JSON/JSONL\n• Parquet\n• Feather")
        
        if state.file_path and os.path.exists(state.file_path):
            file_size = os.path.getsize(state.file_path)
            st.metric("Current File", f"{file_size / 1024 / 1024:.1f} MB")
    
    # Handle upload
    if uploaded_file is not None and state.df is None:
        _handle_file_upload(uploaded_file)
    
    # Show data status
    if state.df is not None:
        _show_data_status()
    
    st.markdown('</div>', unsafe_allow_html=True)

    # Database connector section
    _render_db_connector(state)


def _handle_file_upload(uploaded_file):
    """Process file upload with automatic or manual configuration"""
    state = st.session_state.app_state
    
    progress_container = st.container()
    
    with progress_container:
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        try:
            # Initialize uploader
            uploader = ChunkedFileUploader()
            
            # Progress callback
            def update_progress(p):
                progress_bar.progress(int(p.percentage))
                status_text.text(f"{p.status}: {p.percentage:.1f}% - {p.message}")
            
            # Upload with progress
            status_text.text("Uploading file...")
            file_path = uploader.upload_with_progress(uploaded_file, update_progress)
            
            # Update state
            state.file_path = file_path
            state.filename = uploaded_file.name
            
            # Load data
            status_text.text("Loading data...")
            progress_bar.progress(50)
            
            loader = StreamingDataLoader(file_path)
            file_type = loader.get_file_type()
            
            # Clear progress and show configuration
            progress_bar.empty()
            status_text.empty()
            
            # For Excel files, show configuration
            if file_type == 'excel':
                all_sheets = loader.get_excel_sheets()
                _show_sheet_selector(loader, all_sheets)
                return
            
            # For non-Excel files, show column configuration
            else:
                _show_column_selector(loader, file_type)
                return
            
        except Exception as e:
            progress_bar.empty()
            status_text.error(f"Error: {str(e)}")
            show_toast(f"Upload failed: {str(e)}", "error")
            state.processing_status = 'error'


def _show_column_selector(loader, file_type):
    """Show simple header row selection for non-Excel files"""
    state = st.session_state.app_state
    
    # Load raw preview
    try:
        raw_preview = loader.load_fast_preview(n_rows=20, header=None)
    except Exception as e:
        st.error(f"Error loading preview: {str(e)}")
        return
    
    # Show raw data
    st.markdown("**Preview Data:**")
    st.dataframe(raw_preview, use_container_width=True, height=300)
    
    # Header row selection
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        header_row = st.number_input(
            "Select header row (0 = first row)",
            min_value=0,
            max_value=max(0, min(50, len(raw_preview) - 1)),
            value=0,
            key="csv_header_row"
        )
    with col2:
        st.metric("Header", f"Row {header_row}")
    with col3:
        if st.button("Load Data", type="primary", use_container_width=True, key="csv_load_btn"):
            _load_csv_with_configuration(loader, header_row)
    
    # Show info about what will happen
    if header_row > 0:
        st.info(f"Row {header_row} will be used as column headers. Rows 0-{header_row-1} will be skipped.")


def _load_csv_with_configuration(loader, header_row):
    """Load non-Excel data with selected header row"""
    state = st.session_state.app_state
    
    try:
        with st.spinner("Loading data..."):
            # Load data with selected header row (standard pandas behavior)
            # This will skip rows above header_row and use header_row as column names
            df = loader.load_full_streaming(header=header_row)
            
            # Store data
            state.df = df
            state.original_df = df.copy()
            state.header_row = header_row
            state.processing_status = 'profiling'
            
            # Trigger profiling
            recalculate_profiles()
            
            # Persist data
            from state.session import _save_persisted_data
            _save_persisted_data()
            
            show_toast(f"Loaded {len(df):,} rows × {len(df.columns)} columns", "success")
            time.sleep(1)
            st.rerun()
            
    except Exception as e:
        st.error(f"Error loading data: {str(e)}")
        show_toast(f"Load failed: {str(e)}", "error")


def _show_sheet_selector(loader, all_sheets):
    """Show simple sheet and header row selection for Excel files"""
    state = st.session_state.app_state
    
    # Sheet selection
    selected_sheet = st.selectbox(
        "Select Sheet",
        all_sheets,
        index=0,
        key="ld_select_sheet"
    )
    
    # Load raw preview
    try:
        raw_preview = loader.load_fast_preview(
            n_rows=20, 
            sheet_name=selected_sheet, 
            header=None
        )
    except Exception as e:
        st.error(f"Error loading preview: {str(e)}")
        return
    
    # Show raw data
    st.markdown("**Preview Data:**")
    st.dataframe(raw_preview, use_container_width=True, height=300)
    
    # Header row selection
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        header_row = st.number_input(
            "Select header row (0 = first row)",
            min_value=0,
            max_value=max(0, min(50, len(raw_preview) - 1)),
            value=0,
            key="excel_header_row"
        )
    with col2:
        st.metric("Header", f"Row {header_row}")
    with col3:
        if st.button("Load Data", type="primary", use_container_width=True, key="excel_load_btn"):
            _load_with_configuration(loader, selected_sheet, header_row)
    
    # Show info about what will happen
    if header_row > 0:
        st.info(f"Row {header_row} will be used as column headers. Rows 0-{header_row-1} will be skipped.")


def _load_with_configuration(loader, selected_sheet, header_row):
    """Load Excel data with selected header row"""
    state = st.session_state.app_state
    
    try:
        with st.spinner("Loading data..."):
            # Load data with selected header row (standard pandas behavior)
            # This will skip rows above header_row and use header_row as column names
            df = loader.load_full_streaming(sheet_name=selected_sheet, header=header_row)
            
            # Store data
            state.df = df
            state.original_df = df.copy()
            state.selected_sheet = selected_sheet
            state.header_row = header_row
            state.processing_status = 'profiling'
            
            # Trigger profiling
            recalculate_profiles()
            
            # Persist data
            from state.session import _save_persisted_data
            _save_persisted_data()
            
            show_toast(f"Loaded {len(df):,} rows × {len(df.columns)} columns", "success")
            time.sleep(1)
            st.rerun()
            
    except Exception as e:
        st.error(f"Error loading data: {str(e)}")
        show_toast(f"Load failed: {str(e)}", "error")


def _show_data_status():
    """Display current data status"""
    state = st.session_state.app_state
    
    st.success(f"**{state.filename}** loaded successfully")
    
    # Show profiling status
    if state.processing_status == 'profiling':
        _render_profiling_status()
    elif state.processing_status == 'ready':
        _render_ready_status()
    
    # Preview and actions
    _render_preview_and_actions()


def _render_profiling_status():
    """Show profiling progress"""
    state = st.session_state.app_state
    
    # Check for updates
    check_profiling_complete()
    
    # Metrics
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Rows", f"{len(state.df):,}")
    with col2:
        st.metric("Columns", len(state.df.columns))
    with col3:
        memory_mb = state.df.memory_usage(deep=True).sum() / 1024 / 1024
        st.metric("Memory", f"{memory_mb:.1f} MB")
    with col4:
        st.metric("Status", "Profiling...")
    
    # Progress message
    msg = "Data profiling in progress... Please wait or check the Data Profiling tab."
    if state.upload_progress:
        total_rows = len(state.df)
        current_col = state.upload_progress.get('current', 0)
        processed_records = current_col * total_rows
        msg = f"Profiling in progress... ({processed_records:,} records processed)"
    
    st.info(msg)
    
    # Show progress bar
    if state.upload_progress:
        prog = state.upload_progress
        progress_msg = prog['message']
        if 'elapsed' in prog:
            progress_msg += f" | Time: {prog['elapsed']}"
        if 'eta' in prog:
            progress_msg += f" | ETA: {prog['eta']}"
        if 'rate' in prog:
            progress_msg += f" ({prog['rate']})"
        
        st.progress(prog['percent'] / 100, text=progress_msg)
        
        # Auto-refresh
        time.sleep(2)
        st.rerun()


def _render_ready_status():
    """Show ready status with metrics"""
    state = st.session_state.app_state
    
    # Metrics
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Rows", f"{len(state.df):,}")
    with col2:
        st.metric("Columns", len(state.df.columns))
    with col3:
        memory_mb = state.df.memory_usage(deep=True).sum() / 1024 / 1024
        st.metric("Memory", f"{memory_mb:.1f} MB")
    with col4:
        if state.quality_report:
            score = state.quality_report.overall_score
            st.metric("Quality Score", f"{score:.0f}/100")
        else:
            st.metric("Status", "Ready")
    
    st.success("Data is ready. Explore other tabs for analysis.")


def _render_preview_and_actions():
    """Show preview and action buttons"""
    state = st.session_state.app_state
    
    # Data preview
    with st.expander("Data Preview (First 100 rows)", expanded=False):
        st.dataframe(state.df.head(100), use_container_width=True, height=300)
    
    # Column summary
    with st.expander("Column Summary", expanded=False):
        col_data = []
        for col in state.df.columns:
            dtype = str(state.df[col].dtype)
            null_count = state.df[col].isnull().sum()
            null_pct = (null_count / len(state.df)) * 100
            col_data.append({
                'Column': col,
                'Type': dtype,
                'Non-Null': f"{len(state.df) - null_count:,}",
                'Null %': f"{null_pct:.1f}%",
                'Unique': state.df[col].nunique()
            })
        
        st.dataframe(pd.DataFrame(col_data), use_container_width=True, hide_index=True)
    
    # Actions
    st.divider()
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("Load Different File", use_container_width=True, key="ld_load_different"):
            state.df = None
            state.original_df = None
            state.file_path = None
            state.processing_status = 'idle'
            st.rerun()
    
    with col2:
        if st.button("Clear All Data", use_container_width=True, type="secondary", key="ld_clear_all"):
            from state.session import clear_data_only
            clear_data_only()
            st.rerun()


def _render_db_connector(state):
    """Render the database connector UI section (SQLAlchemy-based)."""
    with st.expander("Connect to Database"):
        try:
            from core.db_connector import (
                _driver_available,
                build_url,
                list_tables,
                load_table,
                run_query,
                test_connection,
                SUPPORTED_ENGINES,
            )
        except ImportError:
            st.error("Database connector module not found.")
            return

        all_labels = list(SUPPORTED_ENGINES.keys())
        db_engine = st.selectbox("Database Engine", all_labels, key="db_engine")

        engine_meta = SUPPORTED_ENGINES.get(db_engine, {})
        driver_ok, install_hint = _driver_available(db_engine)

        if driver_ok:
            st.caption(f"Driver: installed")
        else:
            st.warning(f"Driver not installed. Run: `{install_hint}`")

        url = ""
        use_raw_url = st.checkbox("Paste a raw SQLAlchemy URL instead", key="db_raw_url_toggle")

        if use_raw_url:
            url = st.text_input(
                "SQLAlchemy URL",
                placeholder="postgresql+psycopg2://user:pass@host:5432/mydb",
                key="db_raw_url",
            )
        elif db_engine in ("SQLite", "DuckDB"):
            db_path = st.text_input("Database file path (.db / .sqlite / .duckdb)", key="db_path")
            if db_path:
                url = build_url(db_engine, database=db_path)
        elif db_engine == "BigQuery":
            gcp_project = st.text_input("GCP Project ID", key="db_bq_project")
            if gcp_project:
                url = build_url("BigQuery", database=gcp_project)
        elif db_engine == "Snowflake":
            sf1, sf2 = st.columns(2)
            with sf1:
                sf_account = st.text_input("Account (e.g. xy12345.us-east-1)", key="db_sf_account")
                sf_database = st.text_input("Database", key="db_sf_database")
            with sf2:
                sf_user = st.text_input("Username", key="db_sf_user")
                sf_pass = st.text_input("Password", type="password", key="db_sf_pass")
            if sf_account and sf_database:
                try:
                    url = build_url("Snowflake", host=sf_account, database=sf_database,
                                    username=sf_user, password=sf_pass)
                except Exception:
                    url = ""
        else:
            dc1, dc2, dc3 = st.columns(3)
            default_port = engine_meta.get("default_port") or 5432
            with dc1:
                db_host = st.text_input("Host", value="localhost", key="db_host")
                db_port = st.number_input("Port", value=default_port, key="db_port")
            with dc2:
                db_name = st.text_input("Database", key="db_name")
            with dc3:
                db_user = st.text_input("Username", key="db_user")
                db_pass = st.text_input("Password", type="password", key="db_pass")
            try:
                url = build_url(db_engine, db_host, int(db_port), db_name, db_user, db_pass)
            except Exception:
                url = ""

        if url and st.button("Connect", key="db_connect", type="primary", use_container_width=True, disabled=not driver_ok):
            try:
                if not test_connection(url):
                    st.error("Connection test failed -- check your credentials and host.")
                else:
                    tables = list_tables(url)
                    st.session_state["_db_tables"] = tables
                    st.session_state["_db_url"] = url
                    show_toast(f"Connected -- {len(tables)} tables found", "success")
                    st.rerun()
            except Exception as exc:
                st.error(f"Connection failed: {exc}")

        tables = st.session_state.get("_db_tables", [])
        if tables:
            table_pick = st.selectbox("Table", tables, key="db_table_pick")
            custom_query = st.text_area("Or enter a custom SQL query", key="db_custom_query", height=80)

            if st.button("Load Table", key="db_load_table", use_container_width=True):
                db_url = st.session_state["_db_url"]
                try:
                    if custom_query.strip():
                        df = run_query(db_url, custom_query.strip())
                    else:
                        df = load_table(db_url, table_pick)

                    state.df = df.copy()
                    state.original_df = df.copy()
                    state.filename = table_pick or "query_result"
                    state.processing_status = "ready"

                    try:
                        from core.audit_log import log_action
                        log_action(
                            "Database Load",
                            detail=f"Table={table_pick}, rows={len(df)}",
                            username=getattr(state, "username", "system") or "system",
                            category="load",
                            row_count=len(df),
                            col_count=len(df.columns),
                        )
                    except Exception:
                        pass

                    recalculate_profiles()
                    show_toast(f"Loaded {len(df):,} rows from database", "success")
                    st.rerun()
                except Exception as exc:
                    st.error(f"Load failed: {exc}")
